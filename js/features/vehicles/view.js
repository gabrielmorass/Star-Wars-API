/* ---------------- Naves e Veículos ---------------- */

export function renderVehiclesView(container, { starships, vehicles }) {
  const datasets = { starships, vehicles };
  const emptyLabel = { starships: "nave", vehicles: "veículo" };
  let current = "starships";

  container.innerHTML = `
    <div class="planets-layout">
      <div>
        <div class="topnav tab-toggle" role="tablist">
          <button type="button" class="active" data-tab="starships" role="tab" aria-selected="true">Naves</button>
          <button type="button" data-tab="vehicles" role="tab" aria-selected="false">Veículos</button>
        </div>
        <div class="people-toolbar">
          <input type="search" id="vehicles-search" placeholder="Buscar por nome…" aria-label="Buscar naves e veículos" />
        </div>
        <div class="card-grid" id="vehicles-grid"></div>
      </div>
      <div class="detail-panel" id="vehicle-detail">
        <p class="state-msg">Selecione um item na lista para ver detalhes.</p>
      </div>
    </div>
  `;

  const grid = container.querySelector("#vehicles-grid");
  const detail = container.querySelector("#vehicle-detail");
  const tabButtons = container.querySelectorAll("[data-tab]");
  const searchInput = container.querySelector("#vehicles-search");
  let searchTerm = "";

  function paintGrid() {
    const list = datasets[current].filter((item) => item.name.toLowerCase().includes(searchTerm));
    grid.innerHTML = list.length
      ? list
          .map(
            (item, i) => `
        <button class="info-card" data-index="${i}" type="button">
          <h3>${item.name}</h3>
          <p class="meta">${item.model}</p>
        </button>`
          )
          .join("")
      : `<p class="state-msg">Nenhum ${emptyLabel[current]} encontrado.</p>`;

    grid.querySelectorAll(".info-card").forEach((el) => {
      el.addEventListener("click", () => selectItem(list[Number(el.dataset.index)]));
    });
  }

  function selectItem(item) {
    const isShip = current === "starships";
    detail.innerHTML = `
      <h3>${item.name}</h3>
      <div class="detail-row"><div class="label">Modelo</div><div class="value">${item.model}</div></div>
      <div class="detail-row"><div class="label">Fabricante</div><div class="value">${item.manufacturer}</div></div>
      <div class="detail-row"><div class="label">Classe</div><div class="value">${isShip ? item.starship_class : item.vehicle_class}</div></div>
      <div class="detail-row"><div class="label">Tripulação / Passageiros</div><div class="value">${item.crew} · ${item.passengers}</div></div>
      <div class="detail-row"><div class="label">Custo (créditos)</div><div class="value">${item.cost_in_credits === "unknown" ? "Desconhecido" : Number(item.cost_in_credits).toLocaleString("pt-BR")}</div></div>
    `;
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.tab === current) return;
      current = btn.dataset.tab;
      tabButtons.forEach((b) => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-selected", String(b === btn));
      });
      detail.innerHTML = `<p class="state-msg">Selecione um item na lista para ver detalhes.</p>`;
      paintGrid();
    });
  });

  searchInput.addEventListener("input", (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    paintGrid();
  });

  paintGrid();
}
