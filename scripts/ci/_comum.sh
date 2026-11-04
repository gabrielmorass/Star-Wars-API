#!/usr/bin/env bash
# Funções compartilhadas pelos scripts de CI — Codex Estelar · S07 NP2
#
# Dono: Gabriel (Bloco A). Os outros scripts de scripts/ci/ usam estas funções
# para que o log do pipeline fique legível e o comportamento de erro seja o
# mesmo em todos. Carregue no topo do seu script:
#
#     #!/usr/bin/env bash
#     set -euo pipefail
#     source "$(dirname "${BASH_SOURCE[0]}")/_comum.sh"
#
# Se precisar de algo novo aqui, avise no grupo antes de editar — este arquivo
# é usado pelos cinco.

set -euo pipefail

# Raiz do repositório, independente de onde o script foi chamado.
RAIZ_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export RAIZ_REPO

# --- saída ---------------------------------------------------------------
# Sem cor quando não há terminal (o console do Jenkins fica mais limpo assim).
if [ -t 1 ]; then
  _AZUL=$'\033[0;34m'; _VERDE=$'\033[0;32m'
  _AMARELO=$'\033[0;33m'; _VERMELHO=$'\033[0;31m'; _FIM=$'\033[0m'
else
  _AZUL=''; _VERDE=''; _AMARELO=''; _VERMELHO=''; _FIM=''
fi

log()    { printf '%s[ci]%s %s\n'    "$_AZUL"     "$_FIM" "$*"; }
ok()     { printf '%s[ok]%s %s\n'    "$_VERDE"    "$_FIM" "$*"; }
aviso()  { printf '%s[aviso]%s %s\n' "$_AMARELO"  "$_FIM" "$*" >&2; }
erro()   { printf '%s[erro]%s %s\n'  "$_VERMELHO" "$_FIM" "$*" >&2; }

# Encerra o script com falha — e, por consequência, o estágio do Jenkins.
falhar() { erro "$*"; exit 1; }

# Cabeçalho de etapa, para achar o começo de cada bloco no console.
etapa() {
  printf '\n%s=== %s ===%s\n' "$_AZUL" "$*" "$_FIM"
}

# --- verificações --------------------------------------------------------
# Falha se um comando não estiver disponível.
#   exigir_comando node "instale o Node 20 (ver jenkins/Dockerfile)"
exigir_comando() {
  local cmd="$1"; local dica="${2:-}"
  command -v "$cmd" >/dev/null 2>&1 || falhar "comando '$cmd' não encontrado. ${dica}"
}

# Falha se uma variável de ambiente estiver vazia ou ausente.
#   exigir_env EMAIL_DESTINATARIO "defina no .env (critério 5)"
exigir_env() {
  local nome="$1"; local dica="${2:-}"
  local valor="${!nome:-}"
  [ -n "$valor" ] || falhar "variável de ambiente '$nome' não definida. ${dica}"
}

# Verdadeiro se o diretório existir e não estiver vazio.
tem_conteudo() {
  [ -d "$1" ] && [ -n "$(ls -A "$1" 2>/dev/null)" ]
}
