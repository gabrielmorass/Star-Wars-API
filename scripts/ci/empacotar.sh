#!/usr/bin/env bash
# Etapa: Empacotar — Codex Estelar · S07 NP2
# Dono: Eduardo (Bloco B)
#
# ETAPA OBRIGATÓRIA 2 do enunciado (build/empacotamento). Gera o pacote
# versionado da aplicação, que o Jenkins arquiva como artefato (critério 4,
# padrão PACOTE_GLOB = dist/*.tgz no Jenkinsfile):
#
#     dist/codex-estelar-<BUILD_NUMBER>-<sha curto>.tgz
#
# O nome carrega as duas identidades do build: o número da execução no
# Jenkins e o commit. Dado um pacote, dá para achar a build e o código exato
# que o geraram — as mesmas duas tags da imagem (scripts/ci/imagem.sh).
#
# Rodar local (fora do Jenkins, BUILD_NUMBER vira "local"):
#     bash scripts/ci/empacotar.sh

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_comum.sh"
cd "$RAIZ_REPO"

etapa "Empacotar"

exigir_comando git
exigir_comando tar

# --- identidade do pacote -------------------------------------------------
# No Jenkins estas variáveis já existem (BUILD_NUMBER é do próprio Jenkins;
# APP_NAME e GIT_SHA_CURTO vêm do Jenkinsfile). Fora dele, valores locais.
APP="${APP_NAME:-codex-estelar}"
BUILD="${BUILD_NUMBER:-local}"
SHA="${GIT_SHA_CURTO:-$(git rev-parse --short HEAD)}"
NOME="${APP}-${BUILD}-${SHA}"
DESTINO="dist"
PACOTE="${DESTINO}/${NOME}.tgz"

# --- o que é "a aplicação" ------------------------------------------------
# O BFF (api/) e o front estático que o nginx serve. Ficam de fora as suítes
# de teste (cypress-project/, api-testing/, performance-testing/), a infra de
# CI e a documentação: não são a aplicação, são o que a valida e a constrói.
# web/ (nginx, Bloco D) entra quando existir.
CANDIDATOS=(api index.html css js public src web)
INCLUIR=()
for caminho in "${CANDIDATOS[@]}"; do
  # Confere no COMMIT, não no disco (ver git archive abaixo).
  if git cat-file -e "HEAD:${caminho}" 2>/dev/null; then
    INCLUIR+=("$caminho")
  fi
done
[ "${#INCLUIR[@]}" -gt 0 ] || falhar "nada para empacotar — nenhum dos caminhos existe no commit."

# --- limpeza --------------------------------------------------------------
# Remove pacotes antigos antes de gerar o novo. O PACOTE_GLOB arquiva
# dist/*.tgz inteiro: um pacote velho sobrando seria arquivado junto, como
# já aconteceu no build #7 (ver comentário do cleanWs no Jenkinsfile).
mkdir -p "$DESTINO"
rm -f "${DESTINO}"/*.tgz

# --- empacotamento --------------------------------------------------------
# git archive, e não tar do diretório. Ele empacota só o que está
# VERSIONADO no commit, o que garante por construção que não entram:
#   - node_modules/, coverage/, relatórios (estão no .gitignore);
#   - .env e qualquer segredo local (idem);
#   - arquivos soltos ou alterações não commitadas na máquina de quem rodou.
# Ou seja: o pacote é exatamente o commit ${SHA}, nada a mais, nada a menos.
#
# --prefix põe tudo dentro de uma pasta com o nome do pacote, para que
# extrair não espalhe arquivos no diretório atual.
log "empacotando ${INCLUIR[*]} do commit ${SHA}"
git archive --format=tar.gz --prefix="${NOME}/" -o "$PACOTE" HEAD -- "${INCLUIR[@]}"

if [ -n "$(git status --porcelain -- "${INCLUIR[@]}")" ]; then
  aviso "há alterações não commitadas em ${INCLUIR[*]}: elas NÃO estão no pacote."
fi

# --- conferência ----------------------------------------------------------
# Defesa em profundidade: se algum dia alguém versionar por engano um
# node_modules ou .env, o pacote é recusado aqui em vez de ir para o Jenkins.
CONTEUDO="$(tar -tzf "$PACOTE")"
# .env.example é permitido (é o contrato de configuração, sem segredo).
PROIBIDOS="$(grep -E '(^|/)(node_modules|coverage)/|(^|/)\.env(\..+)?$' <<<"$CONTEUDO" \
             | grep -v '\.env\.example$' || true)"
[ -z "$PROIBIDOS" ] || falhar "o pacote contém arquivos proibidos: $(head -3 <<<"$PROIBIDOS" | tr '\n' ' ')"
grep -q "^${NOME}/api/package-lock.json$" <<<"$CONTEUDO" \
  || falhar "api/package-lock.json ausente do pacote — sem ele a instalação não é reproduzível."

ARQUIVOS="$(grep -cv '/$' <<<"$CONTEUDO")"
TAMANHO="$(du -h "$PACOTE" | cut -f1)"
ok "pacote gerado: ${PACOTE} (${ARQUIVOS} arquivos, ${TAMANHO})"
