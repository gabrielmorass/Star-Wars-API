import { getPlanetSpecies, getPlanetFilms } from "./api.js";

/* ---------------- Sistema planetário ---------------- */

export function renderPlanetsView(container, planets) {
  let index = 0;

  container.innerHTML = `
    <div class="people-toolbar">
      <input type="search" id="planet-search" placeholder="Ir para um planeta pelo nome…" aria-label="Buscar planeta" />
    </div>
    <div class="carousel">
      <button class="carousel-arrow" id="prev-planet" type="button" aria-label="Planeta anterior">‹</button>
      <div class="detail-panel carousel-card" id="planet-card" tabindex="0"></div>
      <button class="carousel-arrow" id="next-planet" type="button" aria-label="Próximo planeta">›</button>
    </div>
    <p class="carousel-position" id="planet-position"></p>
  `;

  const card = container.querySelector("#planet-card");
  const position = container.querySelector("#planet-position");
  const prevBtn = container.querySelector("#prev-planet");
  const nextBtn = container.querySelector("#next-planet");
  const searchInput = container.querySelector("#planet-search");

  async function show(newIndex) {
    index = (newIndex + planets.length) % planets.length;
    const planet = planets[index];
    position.textContent = `${index + 1} / ${planets.length}`;
    card.innerHTML = `<p class="state-msg">Carregando ${planet.name}…</p>`;

    const [species, films] = await Promise.all([
      getPlanetSpecies(planet),
      getPlanetFilms(planet),
    ]);

    card.innerHTML = `
      <h3>${planet.name}</h3>
      <div class="detail-row">
        <div class="label">Clima / Terreno</div>
        <div class="value">${planet.climate} · ${planet.terrain}</div>
      </div>
      <div class="detail-row">
        <div class="label">População</div>
        <div class="value">${planet.population === "unknown" ? "Desconhecida" : Number(planet.population).toLocaleString("pt-BR")}</div>
      </div>
      <div class="detail-row">
        <div class="label">Espécies presentes (derivado dos moradores)</div>
        <div class="pill-list">
          ${species.length ? species.map((s) => `<span class="pill">${s}</span>`).join("") : '<span class="value">Nenhum morador catalogado</span>'}
        </div>
      </div>
      <div class="detail-row">
        <div class="label">Aparições (proxy de "acontecimentos")</div>
        <div class="pill-list">
          ${films.length ? films.map((f) => `<span class="pill">Ep. ${f.episode} — ${f.title}</span>`).join("") : '<span class="value">Nenhuma</span>'}
        </div>
      </div>
    `;
  }

  prevBtn.addEventListener("click", () => show(index - 1));
  nextBtn.addEventListener("click", () => show(index + 1));
  card.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
  });

  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.trim().toLowerCase();
    if (!term) return;
    const found = planets.findIndex((p) => p.name.toLowerCase().includes(term));
    if (found !== -1) show(found);
  });

  show(0);
  card.focus();
}
