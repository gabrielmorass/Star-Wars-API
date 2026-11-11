#!/usr/bin/env bash
# Verificação de ambiente — Codex Estelar · S07 NP2
# Dono: Gabriel (Bloco A)
#
# Rode ISTO antes de qualquer outra coisa, na primeira vez que for trabalhar
# no projeto:
#
#     bash scripts/ci/verificar-ambiente.sh
#
# Ele confere o que precisa estar no lugar e, quando algo está errado, diz o
# comando exato para corrigir. Existe porque o time todo trabalha no Windows,
# e três armadilhas desse ambiente já custaram tempo: o GID do socket do
# Docker, a conversão de caminho do Git Bash e os fins de linha CRLF.
#
# Sai com 0 se tudo estiver pronto, 1 se houver pendência.

set -uo pipefail   # sem -e: queremos coletar TODOS os problemas, não parar no primeiro
source "$(dirname "${BASH_SOURCE[0]}")/_comum.sh"
cd "$RAIZ_REPO"

PROBLEMAS=0
falhou() { erro "$1"; [ -n "${2:-}" ] && printf '          → %s\n' "$2" >&2; PROBLEMAS=$((PROBLEMAS+1)); }

etapa "Verificação de ambiente"

# --- 1. Docker ------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  falhou "Docker não encontrado." "Instale o Docker Desktop: https://www.docker.com/products/docker-desktop/"
elif ! docker info >/dev/null 2>&1; then
  falhou "Docker instalado, mas o daemon não responde." "Abra o Docker Desktop e espere ficar verde. 'docker --version' funciona sem o daemon — não serve como teste."
else
  ok "Docker $(docker version --format '{{.Server.Version}}' 2>/dev/null) com daemon no ar"
fi

# --- 2. Docker Compose ----------------------------------------------------
if docker compose version >/dev/null 2>&1; then
  ok "Docker Compose $(docker compose version --short 2>/dev/null)"
else
  falhou "'docker compose' não disponível." "Use o Docker Desktop atual; a versão antiga 'docker-compose' (com hífen) não serve."
fi

# --- 3. Node --------------------------------------------------------------
if command -v node >/dev/null 2>&1; then
  NODE_MAIOR="$(node --version | sed 's/^v//' | cut -d. -f1)"
  if [ "${NODE_MAIOR:-0}" -ge 20 ] 2>/dev/null; then
    ok "Node $(node --version)"
  else
    falhou "Node $(node --version) é antigo; o projeto usa 20+." "Instale o Node 20 LTS: https://nodejs.org/"
  fi
else
  falhou "Node não encontrado." "Instale o Node 20 LTS: https://nodejs.org/"
fi

# --- 4. .env --------------------------------------------------------------
if [ ! -f .env ]; then
  falhou "Arquivo .env não existe." "Rode: cp .env.example .env    (e depois preencha)"
else
  ok "Arquivo .env presente"
  senha="$(grep -E '^JENKINS_ADMIN_PASSWORD=' .env | cut -d= -f2-)"
  if [ -z "$senha" ]; then
    falhou "JENKINS_ADMIN_PASSWORD está vazio no .env." "Defina uma senha, senão o Jenkins sobe com 'admin'."
  fi
  ramo="$(grep -E '^REPO_BRANCH=' .env | cut -d= -f2-)"
  if [ "$ramo" != "main" ]; then
    aviso "REPO_BRANCH=$ramo — o Jenkins vai construir ESSA branch, não a main."
    aviso "Normal durante desenvolvimento. Antes da defesa, deixe 'main'."
  fi
fi

# --- 5. GID do socket do Docker ------------------------------------------
if docker info >/dev/null 2>&1; then
  GID_REAL="$(MSYS_NO_PATHCONV=1 docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                alpine stat -c '%g' /var/run/docker.sock 2>/dev/null | tr -d '\r')"
  if [ -z "$GID_REAL" ]; then
    aviso "Não consegui ler o GID do socket. Se o Jenkins falhar em 'docker build', veja jenkins/README.md."
  else
    GID_ENV="$(grep -E '^DOCKER_GID=' .env 2>/dev/null | cut -d= -f2-)"
    if [ "$GID_ENV" = "$GID_REAL" ]; then
      ok "DOCKER_GID=$GID_REAL confere com o socket desta máquina"
    else
      falhou "DOCKER_GID=${GID_ENV:-<vazio>} no .env, mas o socket desta máquina usa $GID_REAL." \
             "Rode: sed -i 's|^DOCKER_GID=.*|DOCKER_GID=$GID_REAL|' .env   e reconstrua a imagem do Jenkins."
    fi
  fi
fi

# --- 6. Fins de linha -----------------------------------------------------
# Script com CRLF quebra dentro do container Linux com "bad interpreter".
COM_CRLF=0
for f in scripts/ci/*.sh; do
  [ -f "$f" ] || continue
  if head -c 4000 "$f" | grep -q $'\r'; then
    falhou "$f está com fim de linha CRLF." "Rode: git add --renormalize . && git checkout -- $f"
    COM_CRLF=1
  fi
done
[ "$COM_CRLF" -eq 0 ] && ok "Scripts com fim de linha LF"

# --- 7. Portas ------------------------------------------------------------
porta_ocupada() {
  if command -v netstat >/dev/null 2>&1; then
    netstat -an 2>/dev/null | grep -qE "[:.]$1[[:space:]].*LISTEN"
  else
    return 1
  fi
}
for p in 8080 8081; do
  if porta_ocupada "$p"; then
    aviso "Porta $p já está em uso. 8081 é o Jenkins e 8080 será o site."
    aviso "Se não for o nosso container, descubra quem é e libere antes de subir."
  fi
done

# --- resultado ------------------------------------------------------------
echo
if [ "$PROBLEMAS" -eq 0 ]; then
  ok "Ambiente pronto. Para subir o Jenkins:"
  printf '     docker compose up -d --build jenkins\n'
  exit 0
else
  erro "$PROBLEMAS pendência(s). Corrija o que está acima e rode de novo."
  exit 1
fi
