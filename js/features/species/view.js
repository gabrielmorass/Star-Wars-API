import { getPlanetName } from "../../core/api.js";

/* ---------------- Espécies ---------------- */

export function renderSpeciesView(container, species) {
  container.innerHTML = `
    <div class="planets-layout">
      <div>
        <div class="people-toolbar">
          <input type="search" id="species-search" placeholder="Buscar espécie por nome…" aria-label="Buscar espécie" />
        </div>
        <div class="card-grid" id="species-grid"></div>
      </div>
      <div class="detail-panel" id="species-detail">
        <p class="state-msg">Selecione uma espécie para ver detalhes.</p>
      </div>
    </div>
  `;

  const grid = container.querySelector("#species-grid");
  const detail = container.querySelector("#species-detail");
  const searchInput = container.querySelector("#species-search");

  async function selectSpecies(sp) {
    detail.innerHTML = `<p class="state-msg">Carregando ${sp.name}…</p>`;
    const homeworld = await getPlanetName(sp.homeworld);
    detail.innerHTML = `
      <h3>${sp.name}</h3>
      <div class="detail-row"><div class="label">Classificação</div><div class="value">${sp.classification} (${sp.designation})</div></div>
      <div class="detail-row"><div class="label">Idioma</div><div class="value">${sp.language}</div></div>
      <div class="detail-row"><div class="label">Expectativa de vida</div><div class="value">${sp.average_lifespan === "unknown" ? "Desconhecida" : `${sp.average_lifespan} anos`}</div></div>
      <div class="detail-row"><div class="label">Planeta natal</div><div class="value">${homeworld}</div></div>
    `;
  }

  function paint(list) {
    grid.innerHTML = list.length
      ? list
          .map(
            (s, i) => `
          <button class="info-card" data-index="${i}" type="button">
            <h3>${s.name}</h3>
            <p class="meta">${s.classification} · ${s.language}</p>
          </button>`
          )
          .join("")
      : `<p class="state-msg">Nenhuma espécie encontrada.</p>`;

    grid.querySelectorAll(".info-card").forEach((el) => {
      el.addEventListener("click", () => selectSpecies(list[Number(el.dataset.index)]));
    });
  }

  paint(species);

  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.trim().toLowerCase();
    paint(species.filter((s) => s.name.toLowerCase().includes(term)));
  });
}
