import { getPortraits, getPersonSpecies } from "./api.js";
import { getPlanetName } from "../../core/api.js";

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
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

  function applyFilter() {
    const term = searchInput.value.trim().toLowerCase();
    paint(term ? people.filter((p) => p.name.toLowerCase().includes(term)) : people);
  }

  applyFilter();
  searchInput.addEventListener("input", applyFilter);
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
