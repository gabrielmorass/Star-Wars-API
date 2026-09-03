/* ---------------- Filmes ---------------- */

export function renderFilmsView(container, films) {
  const sorted = [...films].sort((a, b) => a.episode_id - b.episode_id);

  container.innerHTML = `
    <div class="people-toolbar">
      <input type="search" id="films-search" placeholder="Buscar filme por título…" aria-label="Buscar filme" />
    </div>
    <div class="card-grid" id="films-grid"></div>
  `;

  const grid = container.querySelector("#films-grid");
  const searchInput = container.querySelector("#films-search");

  function paint(list) {
    grid.innerHTML = list.length
      ? list
          .map(
            (f, i) => `
        <button class="info-card" data-index="${i}" type="button">
          <h3>Ep. ${f.episode_id} — ${f.title}</h3>
          <p class="meta">${new Date(f.release_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · Dir. ${f.director}</p>
        </button>`
          )
          .join("")
      : `<p class="state-msg">Nenhum filme encontrado.</p>`;

    grid.querySelectorAll(".info-card").forEach((el) => {
      el.addEventListener("click", () => renderFilmModal(list[Number(el.dataset.index)]));
    });
  }

  paint(sorted);

  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.trim().toLowerCase();
    paint(sorted.filter((f) => f.title.toLowerCase().includes(term)));
  });
}

export function renderFilmModal(film) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal modal-film" role="dialog" aria-modal="true" aria-label="Detalhes de ${film.title}">
      <button class="modal-close" type="button" aria-label="Fechar">×</button>
      <h3>Ep. ${film.episode_id} — ${film.title}</h3>
      <div class="detail-row"><div class="label">Diretor</div><div class="value">${film.director}</div></div>
      <div class="detail-row"><div class="label">Produção</div><div class="value">${film.producer}</div></div>
      <div class="detail-row"><div class="label">Lançamento</div><div class="value">${new Date(film.release_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</div></div>
      <div class="detail-row">
        <div class="label">Abertura</div>
        <div class="value film-crawl">${film.opening_crawl}</div>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  function close() { backdrop.remove(); }
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector(".modal-close").addEventListener("click", close);
}
