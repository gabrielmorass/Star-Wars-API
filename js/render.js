import { getPlanetSpecies, getPlanetFilms, getPersonSpecies, getPlanetName, getPortraits } from "./api.js";

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function renderHub(container, navigate) {
  container.innerHTML = `
    <section class="hub-hero">
      <h1>Codex Estelar</h1>
      <p>Uma enciclopédia navegável da saga: explore o sistema planetário e conheça os personagens que o habitam.</p>
    </section>
    <div class="hub-cards">
      <button class="hub-card" data-nav="planets" type="button">
        <span class="hub-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <ellipse cx="12" cy="12" rx="10" ry="3.2" transform="rotate(-20 12 12)"></ellipse>
          </svg>
        </span>
        <h2>Sistema planetário</h2>
        <p>Navegue pelos planetas e veja espécies presentes e filmes em que aparecem.</p>
        <span class="hub-card-arrow" aria-hidden="true">Explorar →</span>
      </button>
      <button class="hub-card" data-nav="people" type="button">
        <span class="hub-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="3.2"></circle>
            <path d="M5 20c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5"></path>
          </svg>
        </span>
        <h2>Personagens</h2>
        <p>Busque e explore os personagens da saga, com detalhes de cada um.</p>
        <span class="hub-card-arrow" aria-hidden="true">Explorar →</span>
      </button>
    </div>
  `;
  container.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", () => navigate(el.dataset.nav));
  });
}

export function renderLoading(container, message = "Carregando dados da SWAPI…") {
  container.innerHTML = `<p class="state-msg">${message}</p>`;
}

export function renderError(container, message) {
  container.innerHTML = `<p class="state-msg error">${message}</p>`;
}

/* ---------------- Sistema planetário ---------------- */

export function renderPlanetsView(container, planets) {
  const width = 640;
  const height = 640;
  const cx = width / 2;
  const cy = height / 2;
  const goldenAngle = 137.508 * (Math.PI / 180);
  const scale = 34;
  const nodeRadius = planets.length > 40 ? 8 : 10;

  const nodes = planets
    .map((planet, i) => {
      const angle = i * goldenAngle;
      const r = scale * Math.sqrt(i + 1);
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      return { planet, x, y };
    })
    .filter((n) => n.x > -20 && n.x < width + 20 && n.y > -20 && n.y < height + 20);

  const svgNodes = nodes
    .map(
      (n, i) => `
      <g class="planet-node" data-index="${i}" tabindex="0" role="button" aria-label="${n.planet.name}">
        <circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${nodeRadius}" />
        <text x="${n.x.toFixed(1)}" y="${(n.y + nodeRadius + 8).toFixed(1)}">${n.planet.name}</text>
      </g>`
    )
    .join("");

  container.innerHTML = `
    <div class="planets-layout">
      <div class="orbit-wrap">
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Mapa dos planetas do universo Star Wars, dispostos em espiral">
          ${svgNodes}
        </svg>
      </div>
      <div class="detail-panel" id="planet-detail">
        <p class="state-msg">Selecione um planeta no mapa para ver detalhes.</p>
      </div>
    </div>
  `;

  const detailPanel = container.querySelector("#planet-detail");
  const nodeEls = container.querySelectorAll(".planet-node");

  async function selectNode(index) {
    nodeEls.forEach((el) => el.classList.remove("selected"));
    nodeEls[index].classList.add("selected");
    const { planet } = nodes[index];
    detailPanel.innerHTML = `<p class="state-msg">Carregando ${planet.name}…</p>`;

    const [species, films] = await Promise.all([
      getPlanetSpecies(planet),
      getPlanetFilms(planet),
    ]);

    detailPanel.innerHTML = `
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

  nodeEls.forEach((el, i) => {
    el.addEventListener("click", () => selectNode(i));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectNode(i);
      }
    });
  });
}

/* ---------------- Personagens ---------------- */

export async function renderPeopleView(container, people, onOpenPerson) {
  container.innerHTML = `
    <div class="people-toolbar">
      <input type="search" id="people-search" placeholder="Buscar personagem por nome…" aria-label="Buscar personagem" />
    </div>
    <div class="people-grid" id="people-grid"><p class="state-msg">Carregando fotos…</p></div>
  `;

  const grid = container.querySelector("#people-grid");
  const searchInput = container.querySelector("#people-search");
  const portraits = await getPortraits();

  function paint(list) {
    if (list.length === 0) {
      grid.innerHTML = `<p class="state-msg">Nenhum personagem encontrado.</p>`;
      return;
    }
    grid.innerHTML = list
      .map((p, i) => {
        const photo = portraits.get(p.name.trim().toLowerCase());
        return `
        <button class="person-card" data-index="${i}" type="button">
          <div class="person-photo-wrap">
            <span class="person-avatar-fallback">${initials(p.name)}</span>
            ${photo ? `<img class="person-photo" src="${photo}" alt="" loading="lazy" />` : ""}
          </div>
          <p class="name">${p.name}</p>
          <p class="meta">${p.birth_year === "unknown" ? "Nasc. desconhecido" : p.birth_year}</p>
        </button>`;
      })
      .join("");
    grid.querySelectorAll(".person-photo").forEach((img) => {
      img.addEventListener(
        "load",
        () => {
          img.previousElementSibling?.classList.add("is-hidden");
        },
        { once: true }
      );
      img.addEventListener("error", () => img.remove(), { once: true });
    });
    grid.querySelectorAll(".person-card").forEach((el) => {
      el.addEventListener("click", () => onOpenPerson(list[Number(el.dataset.index)]));
    });
  }

  paint(people);

  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.trim().toLowerCase();
    paint(people.filter((p) => p.name.toLowerCase().includes(term)));
  });
}

export async function renderPersonModal(person) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal modal-person" role="dialog" aria-modal="true" aria-label="Detalhes de ${person.name}">
      <button class="modal-close" type="button" aria-label="Fechar">×</button>
      <div class="modal-photo-wrap">
        <span class="person-avatar-fallback">${initials(person.name)}</span>
      </div>
      <h3>${person.name}</h3>
      <div class="detail-row"><div class="label">Altura / Massa</div><div class="value">${person.height} cm · ${person.mass} kg</div></div>
      <div class="detail-row"><div class="label">Nascimento</div><div class="value">${person.birth_year}</div></div>
      <div class="detail-row"><div class="label">Espécie</div><div class="value" id="modal-species">Carregando…</div></div>
      <div class="detail-row"><div class="label">Planeta natal</div><div class="value" id="modal-homeworld">Carregando…</div></div>
    </div>
  `;
  document.body.appendChild(backdrop);

  function close() { backdrop.remove(); }
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector(".modal-close").addEventListener("click", close);

  const [species, homeworld, portraits] = await Promise.all([
    getPersonSpecies(person),
    getPlanetName(person.homeworld),
    getPortraits(),
  ]);
  backdrop.querySelector("#modal-species").textContent = species;
  backdrop.querySelector("#modal-homeworld").textContent = homeworld;

  const photoUrl = portraits.get(person.name.trim().toLowerCase());
  if (photoUrl) {
    const img = document.createElement("img");
    img.className = "person-photo";
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener(
      "load",
      () => {
        img.previousElementSibling?.classList.add("is-hidden");
      },
      { once: true }
    );
    img.addEventListener("error", () => img.remove(), { once: true });
    img.src = photoUrl;
    backdrop.querySelector(".modal-photo-wrap").appendChild(img);
  }
}
