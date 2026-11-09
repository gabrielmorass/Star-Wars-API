#!/usr/bin/env bash
# Etapa: Smoke test no ambiente containerizado — Codex Estelar · S07 NP2
# Dono: Samile (Bloco D)
#
# Sobe web + api + redis com o docker-compose.yml, espera os healthchecks
# ficarem verdes, confere que os containers se enxergam pela rede codex-net e
# derruba tudo no final, passando ou falhando (trap EXIT).
#
# Os testes rodam POR DENTRO da rede do compose (docker compose exec), e não
# com curl em localhost. Motivo: no pipeline este script roda dentro do
# container do Jenkins, mas os containers que ele sobe pelo socket do Docker
# rodam no host — de dentro do Jenkins, "localhost" não chega neles. Fazer
# assim também prova o critério 8: web -> api por HTTP e api -> redis por TCP.
#
# O Jenkins NÃO é subido aqui (ele já é quem está executando este script).
# O projeto usa nome próprio (-p) e portas próprias para não derrubar nem
# brigar com o ambiente de desenvolvimento.
#
# Variáveis opcionais:
#   SMOKE_DEV=1        usa também o docker-compose.override.yml (api com build local)
#   SMOKE_ROTA         rota real a conferir (padrão: /api/vehicles)
#   SMOKE_ESPERADO     trecho que precisa aparecer no corpo da rota (padrão: name)
#   SMOKE_ESPERA       segundos de espera pelos healthchecks (padrão: 180)
#
# Rodar local (Git Bash):
#     bash scripts/ci/smoke.sh

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_comum.sh"
cd "$RAIZ_REPO"

etapa "Smoke test (ambiente containerizado)"

PROJETO="smoke-codex"
ROTA="${SMOKE_ROTA:-/api/vehicles}"
ESPERADO="${SMOKE_ESPERADO:-name}"
ESPERA="${SMOKE_ESPERA:-180}"
SERVICOS=(redis api web)

# Portas do host só para não colidir com o ambiente que já estiver de pé.
export WEB_PORT="${SMOKE_WEB_PORT:-18080}"
export API_PORT="${SMOKE_API_PORT:-13000}"

exigir_comando docker "o Docker CLI é instalado no jenkins/Dockerfile."
docker compose version >/dev/null 2>&1 || falhar "plugin 'docker compose' não encontrado."

COMPOSE=(docker compose -p "$PROJETO" -f docker-compose.yml)
if [ "${SMOKE_DEV:-0}" = "1" ]; then
  COMPOSE+=(-f docker-compose.override.yml)
  aviso "SMOKE_DEV=1: a api será construída localmente (override)"
fi

# --- limpeza garantida ----------------------------------------------------
limpar() {
  local codigo=$?
  if [ "$codigo" -ne 0 ]; then
    aviso "smoke test falhou (código ${codigo}); estado dos containers e últimos logs:"
    "${COMPOSE[@]}" ps -a || true
    "${COMPOSE[@]}" logs --tail 40 "${SERVICOS[@]}" || true
  fi
  log "derrubando o ambiente de smoke"
  "${COMPOSE[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
  exit "$codigo"
}
trap limpar EXIT

# Sobra de uma execução anterior interrompida.
"${COMPOSE[@]}" down -v --remove-orphans >/dev/null 2>&1 || true

# --- subir e esperar ------------------------------------------------------
log "subindo ${SERVICOS[*]} (espera máxima de ${ESPERA}s pelos healthchecks)"
"${COMPOSE[@]}" up -d --build --wait --wait-timeout "$ESPERA" "${SERVICOS[@]}" \
  || falhar "os containers não ficaram saudáveis a tempo"
"${COMPOSE[@]}" ps
ok "redis, api e web saudáveis"

# --- verificações ---------------------------------------------------------
# Executa um GET dentro do container "web" e confere status 200 e, se pedido,
# um trecho no corpo.
#   checar_http "descrição" "url" ["trecho esperado"]
checar_http() {
  local descricao="$1" url="$2" trecho="${3:-}" saida
  log "$descricao: GET $url"
  saida="$("${COMPOSE[@]}" exec -T web wget -S -O- "$url" 2>&1)" \
    || falhar "$descricao: requisição falhou (${url})"
  grep -Eq 'HTTP/[0-9.]+ 200' <<<"$saida" \
    || falhar "$descricao: status diferente de 200 em ${url}"
  if [ -n "$trecho" ]; then
    grep -q "$trecho" <<<"$saida" \
      || falhar "$descricao: o corpo de ${url} não contém '${trecho}'"
  fi
  ok "$descricao"
}

etapa "Verificações"

# 1. web -> api direto pela rede codex-net (critério 8, primeiro par).
checar_http "web alcança a api na rede codex-net" "http://api:3000/api/health"

# 2. web -> api passando pelo proxy do nginx (web/nginx.conf).
checar_http "proxy do nginx chega na api" "http://localhost/api/health"

# 3. rota real do BFF, pelo caminho que o navegador usa.
checar_http "rota real do BFF (${ROTA})" "http://localhost${ROTA}" "$ESPERADO"

# 4. redis respondendo (critério 8, segundo par: api -> redis na 6379).
log "redis responde ao PING"
[ "$("${COMPOSE[@]}" exec -T redis redis-cli ping | tr -d '\r')" = "PONG" ] \
  || falhar "redis não respondeu PONG"
ok "redis responde ao PING"

ok "smoke test concluído"