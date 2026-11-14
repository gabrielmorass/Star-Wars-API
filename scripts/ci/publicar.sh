#!/usr/bin/env bash
# Etapa: Publicar imagem — Codex Estelar · S07 NP2
# Dono: Lima (Bloco E)
#
# Publica no Docker Hub a imagem construída por scripts/ci/imagem.sh com as
# tags do commit, do build (quando disponível) e latest.
#
# Rodar local (configure DOCKERHUB_USER e DOCKERHUB_TOKEN no ambiente):
#     bash scripts/ci/publicar.sh

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_comum.sh"
cd "$RAIZ_REPO"

etapa "Publicar imagem no Docker Hub"

# Fecha a sessão ao sair, inclusive quando login, tag ou push falhar.
finalizar() {
  local codigo=$?
  trap - EXIT
  docker logout >/dev/null 2>&1 || true
  exit "$codigo"
}
trap finalizar EXIT

exigir_comando docker "o Docker CLI é instalado no jenkins/Dockerfile."
exigir_env DOCKERHUB_USER "defina no ambiente do Jenkins (credencial Docker Hub)."
exigir_env DOCKERHUB_TOKEN "defina no ambiente do Jenkins (credencial Docker Hub)."

# O nome de origem segue exatamente o padrão usado na construção da imagem.
IMAGEM_REPO="${IMAGE_REPO:-${DOCKERHUB_USER}/codex-estelar-api}"
DESTINO_REPO="${DOCKERHUB_REPO:-${DOCKERHUB_USER}/codex-estelar-api}"

# Jenkins fornece o SHA curto; fora dele usamos o commit local, como imagem.sh.
if [ -n "${GIT_SHA_CURTO:-}" ]; then
  TAG_SHA="$GIT_SHA_CURTO"
else
  exigir_comando git
  TAG_SHA="$(git rev-parse --short HEAD)"
fi

# Valida as tags antes de chamar o Docker para obter uma falha legível.
[[ "$TAG_SHA" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]] \
  || falhar "tag de commit inválida: '${TAG_SHA}'"
[ "$TAG_SHA" != "latest" ] \
  || falhar "a tag do commit não pode ser 'latest'."

TAGS_PUBLICAR=("$TAG_SHA")
if [ -n "${BUILD_NUMBER:-}" ]; then
  [[ "$BUILD_NUMBER" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]] \
    || falhar "tag de build inválida: '${BUILD_NUMBER}'"
  [ "$BUILD_NUMBER" != "latest" ] \
    || falhar "a tag do build não pode ser 'latest'."
  if [ "$BUILD_NUMBER" != "$TAG_SHA" ]; then
    TAGS_PUBLICAR+=("$BUILD_NUMBER")
  fi
fi
TAGS_PUBLICAR+=("latest")

# Confere a saída de imagem.sh antes de iniciar uma sessão autenticada.
IMAGEM_LOCAL="${IMAGEM_REPO}:${TAG_SHA}"
docker image inspect "$IMAGEM_LOCAL" >/dev/null 2>&1 \
  || falhar "imagem local não encontrada: ${IMAGEM_LOCAL}. Execute scripts/ci/imagem.sh primeiro."

# O token entra pelo stdin para não aparecer na lista de argumentos do processo.
log "autenticando no Docker Hub como ${DOCKERHUB_USER}"
printf '%s' "$DOCKERHUB_TOKEN" \
  | docker login --username "$DOCKERHUB_USER" --password-stdin \
  || falhar "não foi possível autenticar no Docker Hub."

# Cria no destino cada tag solicitada a partir da mesma imagem local.
for tag in "${TAGS_PUBLICAR[@]}"; do
  docker tag "$IMAGEM_LOCAL" "${DESTINO_REPO}:${tag}" \
    || falhar "não foi possível criar a tag ${DESTINO_REPO}:${tag}."
done

# Envia todas as tags para que cada referência publicada aponte ao mesmo build.
for tag in "${TAGS_PUBLICAR[@]}"; do
  log "publicando ${DESTINO_REPO}:${tag}"
  docker push "${DESTINO_REPO}:${tag}" \
    || falhar "falha ao publicar ${DESTINO_REPO}:${tag}."
done

ok "imagem publicada: ${DESTINO_REPO} (${TAGS_PUBLICAR[*]})"
