// Estados genéricos de UI (carregando / erro), reaproveitados por todas
// as rotas em main.js — não pertencem a nenhuma feature específica.

export function renderLoading(container, message = "Carregando dados da SWAPI…") {
  container.innerHTML = `<p class="state-msg">${message}</p>`;
}

export function renderError(container, message) {
  container.innerHTML = `<p class="state-msg error">${message}</p>`;
}
