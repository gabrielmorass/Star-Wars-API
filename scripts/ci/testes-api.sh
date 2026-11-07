#!/usr/bin/env bash
# Etapa: Testes de API (contratos externos) — Codex Estelar · S07 NP2
# Dono: Gabriel (Bloco A)
#
# Executa a coleção Postman/Newman escrita na NP1, que valida os contratos da
# SWAPI — a API pública que a aplicação consome.
#
# ATENÇÃO AO QUE ESTE ESTÁGIO É E NÃO É:
#
#   É      — verificação de que a API externa continua respondendo o que a
#            aplicação espera (status, campos, paginação, erro 404). Se a SWAPI
#            mudar um contrato, descobrimos aqui e não pelo usuário.
#
#   NÃO É  — cobertura do NOSSO código. Nenhuma linha do Codex Estelar é
#            executada por estes testes. A cobertura de 90% exigida pelo
#            critério 1 vem dos testes unitários do BFF, em
#            scripts/ci/testes.sh, que é da Daniele (Bloco C).
#
# Os dois estágios coexistem de propósito, com donos e propósitos distintos.
# Saber explicar essa diferença vale ponto na arguição.
#
# Rodar local:
#     bash scripts/ci/testes-api.sh

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_comum.sh"
cd "$RAIZ_REPO"

etapa "Testes de API (contratos da SWAPI)"

PASTA="api-testing"
COLECAO="${PASTA}/collections/swapi.collection.json"
AMBIENTE="${PASTA}/environments/swapi.environment.json"
SAIDA="${PASTA}/relatorios"

[ -f "$COLECAO" ]  || falhar "coleção não encontrada em $COLECAO"
[ -f "$AMBIENTE" ] || falhar "environment não encontrado em $AMBIENTE"

exigir_comando node "o Node é instalado no jenkins/Dockerfile."
exigir_comando npm

# --- dependências ---------------------------------------------------------
# node_modules é ignorado pelo git, então no workspace do Jenkins ele nunca
# existe — ainda mais agora que o pipeline limpa o workspace a cada execução.
if [ ! -d "${PASTA}/node_modules" ]; then
  log "instalando dependências de ${PASTA}/"
  if [ -f "${PASTA}/package-lock.json" ]; then
    ( cd "$PASTA" && npm ci --no-audit --no-fund )
  else
    aviso "sem package-lock.json; usando npm install"
    ( cd "$PASTA" && npm install --no-audit --no-fund )
  fi
else
  log "dependências de ${PASTA}/ já presentes"
fi

mkdir -p "$SAIDA"

# --- execução -------------------------------------------------------------
# Três relatórios, cada um com um destino:
#   cli       → console do Jenkins, para quem está olhando a execução
#   junit     → aba "Tests" do build (critério 4)
#   htmlextra → relatório navegável, arquivado como artefato (critério 4)
log "executando a coleção"

# Rodamos DE DENTRO de api-testing, com caminhos relativos.
#
# Não é detalhe de estilo. Chamando `npx newman` da raiz do repositório, o npx
# não encontra o newman local (ele está em api-testing/node_modules) e baixa
# uma cópia temporária do registry — que não tem o plugin htmlextra instalado.
# E o newman IGNORA EM SILÊNCIO um reporter que não consegue carregar: o
# relatório HTML simplesmente não era gerado, sem erro nenhum, e a etapa
# terminava com sucesso. Levou um tempo para encontrar.
(
  cd "$PASTA"
  npx newman run "collections/swapi.collection.json" \
    -e "environments/swapi.environment.json" \
    --reporters cli,junit,htmlextra \
    --reporter-junit-export "relatorios/newman-junit.xml" \
    --reporter-htmlextra-export "relatorios/newman.html" \
    --reporter-htmlextra-title "Testes de API — Codex Estelar" \
    --timeout-request 15000
)

# Confere que os dois relatórios saíram mesmo. Sem esta verificação, um
# reporter que falha em silêncio passaria despercebido de novo.
[ -s "${SAIDA}/newman-junit.xml" ] || falhar "relatório JUnit não foi gerado em ${SAIDA}/newman-junit.xml"
[ -s "${SAIDA}/newman.html" ]      || falhar "relatório HTML não foi gerado em ${SAIDA}/newman.html"

ok "coleção executada"
log "relatórios em ${SAIDA}/ (newman-junit.xml e newman.html)"
