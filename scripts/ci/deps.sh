#!/usr/bin/env bash
# Etapa: Dependências — Codex Estelar · S07 NP2
# Dono: Gabriel (Bloco A)
#
# Instala as dependências necessárias para os estágios seguintes do pipeline.
# Roda local do mesmo jeito que no Jenkins:
#
#     bash scripts/ci/deps.sh
#
# Nota de prazo: enquanto o BFF (api/) não existir — ele é do Eduardo, Bloco B
# — este script apenas avisa e sai com sucesso, para não travar o pipeline dos
# outros. Assim que api/package.json for commitado, ele passa a instalar de
# verdade sozinho.

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_comum.sh"

cd "$RAIZ_REPO"

etapa "Dependências"

exigir_comando node "o Node é instalado no jenkins/Dockerfile — se faltar aqui, a imagem está desatualizada."
exigir_comando npm

log "node $(node --version) · npm $(npm --version)"

if [ ! -f "api/package.json" ]; then
  aviso "api/package.json ainda não existe — o BFF é do Eduardo (Bloco B)."
  aviso "Nada a instalar por enquanto. Seguindo."
  exit 0
fi

log "instalando dependências de api/"

# npm ci exige package-lock.json e instala exatamente as versões travadas —
# é o que torna a build reproduzível. Sem lock, cai para npm install e avisa.
if [ -f "api/package-lock.json" ]; then
  ( cd api && npm ci --no-audit --no-fund )
else
  aviso "api/package-lock.json não encontrado; usando 'npm install'."
  aviso "Commitar o lock deixa a build reproduzível (critério 2)."
  ( cd api && npm install --no-audit --no-fund )
fi

ok "dependências instaladas"
