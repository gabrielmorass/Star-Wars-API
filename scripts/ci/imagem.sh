#!/usr/bin/env bash
# Etapa: Construir imagem — Codex Estelar · S07 NP2
# Dono: Eduardo (Bloco B)
#
# Constrói a imagem do BFF a partir de api/Dockerfile com DUAS tags:
#
#     <IMAGE_REPO>:<BUILD_NUMBER>    ex.: codexestelar/codex-estelar-api:42
#     <IMAGE_REPO>:<sha curto>       ex.: codexestelar/codex-estelar-api:9c96001
#
# NUNCA "latest". latest é uma tag móvel: não diz qual código está dentro, e
# duas máquinas com "latest" podem estar rodando versões diferentes. Com as
# duas tags acima, toda imagem aponta para uma execução do Jenkins E para um
# commit — e dá para voltar a qualquer versão anterior pelo número.
#
# A publicação no Docker Hub NÃO é feita aqui: é o estágio seguinte,
# scripts/ci/publicar.sh (Lima, Bloco E), que deve enviar estas mesmas duas
# tags, calculadas pelas mesmas variáveis abaixo.
#
# Rodar local (fora do Jenkins, a tag de build vira "local"):
#     bash scripts/ci/imagem.sh

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_comum.sh"
cd "$RAIZ_REPO"

etapa "Construir imagem"

exigir_comando docker "o Docker CLI é instalado no jenkins/Dockerfile."
exigir_comando git
# "docker --version" funciona sem daemon; "docker info" não. É este que
# prova que o socket do host está acessível (ver jenkins/README.md).
docker info >/dev/null 2>&1 \
  || falhar "o daemon do Docker não responde. No Jenkins, confira o DOCKER_GID (jenkins/README.md)."

CONTEXTO="api"
[ -f "${CONTEXTO}/Dockerfile" ] || falhar "${CONTEXTO}/Dockerfile não encontrado."

# --- tags -----------------------------------------------------------------
# No Jenkins: IMAGE_REPO e GIT_SHA_CURTO vêm do Jenkinsfile, BUILD_NUMBER do
# próprio Jenkins. Fora dele, o mesmo padrão de nome do Jenkinsfile, para a
# imagem local ter o mesmo nome da que o pipeline gera.
REPO="${IMAGE_REPO:-${DOCKERHUB_USER:-codexestelar}/codex-estelar-api}"
TAG_BUILD="${BUILD_NUMBER:-local}"
TAG_SHA="${GIT_SHA_CURTO:-$(git rev-parse --short HEAD)}"

# Regra do Docker para tags: letras, números, _ . - (até 128, sem começar
# com . ou -). Validar aqui dá um erro claro em vez de um erro do docker.
for tag in "$TAG_BUILD" "$TAG_SHA"; do
  [[ "$tag" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]] || falhar "tag inválida: '${tag}'"
  [ "$tag" != "latest" ] || falhar "a tag 'latest' é proibida neste projeto (ver cabeçalho)."
done

if [ -n "$(git status --porcelain -- "$CONTEXTO")" ]; then
  aviso "há alterações não commitadas em ${CONTEXTO}/: a imagem NÃO corresponde"
  aviso "exatamente ao commit ${TAG_SHA}. Normal ao testar local; no Jenkins não acontece."
fi

# --- build ----------------------------------------------------------------
# - as duas -t no MESMO build: são dois nomes para a mesma imagem (mesmo ID),
#   e não duas builds que poderiam sair diferentes;
# - os labels OCI gravam na própria imagem de onde ela veio, legível com
#   "docker inspect" mesmo depois de retagueada. Só o commit, de propósito:
#   label com data ou com o número do build mudaria o ID da imagem a cada
#   execução, mesmo com código idêntico, e ela deixaria de ser reproduzível
#   (o número do build já está na tag);
# - SOURCE_DATE_EPOCH (data do commit) e --provenance=false: por padrão o
#   BuildKit grava a HORA do build no campo "created" da imagem e anexa uma
#   atestação de proveniência que também tem horário. Com isso, o mesmo
#   commit construído duas vezes dava duas imagens com IDs diferentes.
#   Fixando a data no commit e sem a atestação, o mesmo código gera
#   exatamente a mesma imagem (critério 2: reproduzível) — testado: builds
#   42 e 43 do mesmo commit saem com o mesmo ID;
# - o contexto é api/, então o .dockerignore de lá é o que vale.
SOURCE_DATE_EPOCH="$(git log -1 --format=%ct)"
export SOURCE_DATE_EPOCH

log "construindo ${REPO} com as tags ${TAG_BUILD} e ${TAG_SHA}"
docker build \
  --provenance=false \
  -t "${REPO}:${TAG_BUILD}" \
  -t "${REPO}:${TAG_SHA}" \
  --label "org.opencontainers.image.title=codex-estelar-api" \
  --label "org.opencontainers.image.revision=$(git rev-parse HEAD)" \
  "$CONTEXTO"

# --- conferência ----------------------------------------------------------
ID_BUILD="$(docker image inspect -f '{{.Id}}' "${REPO}:${TAG_BUILD}")"
ID_SHA="$(docker image inspect -f '{{.Id}}' "${REPO}:${TAG_SHA}")"
[ "$ID_BUILD" = "$ID_SHA" ] || falhar "as duas tags apontam para imagens diferentes."

USUARIO="$(docker image inspect -f '{{.Config.User}}' "${REPO}:${TAG_SHA}")"
case "$USUARIO" in
  ""|root|0|0:*) falhar "a imagem roda como root (USER='${USUARIO}'); o Dockerfile exige usuário não-root." ;;
esac

ok "imagem construída: ${REPO}:${TAG_BUILD} e ${REPO}:${TAG_SHA}"
log "id ${ID_SHA:7:12} · usuário ${USUARIO}"
docker image ls "$REPO" --format '  {{.Repository}}:{{.Tag}}  {{.Size}}' | grep -E ":(${TAG_BUILD}|${TAG_SHA}) " || true
