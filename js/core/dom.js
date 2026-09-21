// Estados genéricos de UI (carregando / erro), reaproveitados por todas
// as rotas em main.js — não pertencem a nenhuma feature específica.

export function renderLoading(container, message = "Carregando dados da SWAPI…") {
  container.innerHTML = `<p class="state-msg">${message}</p>`;
}

export function renderError(container, message) {
  container.innerHTML = `<p class="state-msg error">${message}</p>`;
}

/* Estado vazio de uma grade de busca. O texto entra EXATAMENTE como veio —
   "Nenhum personagem encontrado." e companhia são afirmados pelos testes —
   e ganha um radar varrendo em cima, só decoração. */
export function estadoVazio(mensagem) {
  return `<p class="state-msg state-msg--vazio">
    <svg class="sv-radar" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="21"/>
      <circle cx="24" cy="24" r="13"/>
      <circle cx="24" cy="24" r="5"/>
      <path class="sv-cruz" d="M24 3v42M3 24h42"/>
      <path class="sv-varredura" d="M24 24L24 3A21 21 0 0 1 42.2 13.5Z"/>
      <circle class="sv-eco" cx="33" cy="14" r="1.8"/>
    </svg>
    <span>${mensagem}</span>
  </p>`;
}
