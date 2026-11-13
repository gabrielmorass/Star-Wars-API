#!/usr/bin/env bash
# Etapa: Testes unitários e de integração do BFF — Daniele (Bloco C).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_comum.sh"

etapa "Testes do BFF e cobertura mínima de 90%"
exigir_comando node
exigir_comando npm
cd "$RAIZ_REPO/api"

# As dependências são instaladas pela etapa Dependências (deps.sh).
# Não capturar o erro: teste reprovado ou cobertura abaixo do limite deve
# encerrar o script com falha e reprovar o estágio do Jenkins.
npm test -- --ci "$@"

[ -s relatorios/junit.xml ] || falhar "JUnit não gerado em api/relatorios/junit.xml"
[ -s coverage/lcov-report/index.html ] || falhar "HTML de cobertura não gerado em api/coverage/lcov-report/"
[ -s coverage/lcov.info ] || falhar "LCOV não gerado em api/coverage/lcov.info"
ok "testes aprovados e relatórios disponíveis para o Jenkins"
