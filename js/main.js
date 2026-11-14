import { renderLoading, renderError } from "./core/dom.js";
import { renderHub } from "./features/hub/view.js";
import { getPlanets } from "./features/planets/api.js";
import { renderPlanetsView } from "./features/planets/view.js";
import { getPeople } from "./features/people/api.js";
import { renderPeopleView, renderPersonModal } from "./features/people/view.js";
import { getFilms } from "./features/films/api.js";
import { renderFilmsView } from "./features/films/view.js";
import { getStarships, getVehicles } from "./features/vehicles/api.js";
import { renderVehiclesView } from "./features/vehicles/view.js";
import { renderTrunfoView } from "./features/trunfo/view.js";
import { lerSessaoSalva, limparSessao } from "./features/trunfo/online.js";
import { getSpecies } from "./features/species/api.js";
import { renderSpeciesView } from "./features/species/view.js";

const app = document.getElementById("app");
const navButtons = document.querySelectorAll(".topnav [data-nav]");
let viewAtual = null;
let limparViewAtual = null;
let sequenciaNavegacao = 0;

/* `starships` fica fora de um par "vehiclesData" porque duas telas usam a
   mesma lista: Naves e Veículos e o Super Trunfo. Assim abrir uma depois da
   outra não refaz o GET /starships. */
const cache = { planets: null, people: null, films: null, starships: null, vehicles: null, species: null };

const TITLES = {
  hub: "Codex Estelar | Enciclopédia da saga",
  planets: "Sistema planetário | Codex Estelar",
  people: "Personagens | Codex Estelar",
  films: "Filmes | Codex Estelar",
  vehicles: "Naves e Veículos | Codex Estelar",
  trunfo: "Super Trunfo | Codex Estelar",
  species: "Espécies | Codex Estelar",
};

async function navigate(view) {
  const sequencia = ++sequenciaNavegacao;
  if (viewAtual === view && limparViewAtual) return;
  if (viewAtual !== view) {
    if (limparViewAtual) limparViewAtual();
    else if (viewAtual === "trunfo") limparSessao();
    limparViewAtual = null;
    viewAtual = view;
  }
  navButtons.forEach((b) => b.classList.toggle("active", b.dataset.nav === view));
  if (TITLES[view]) document.title = TITLES[view];

  if (view === "hub") {
    renderHub(app, navigate);
    return;
  }

  if (view === "planets") {
    renderLoading(app, "Buscando planetas na SWAPI…");
    try {
      if (!cache.planets) cache.planets = await getPlanets();
      if (sequencia !== sequenciaNavegacao) return;
      renderPlanetsView(app, cache.planets);
    } catch (err) {
      if (sequencia !== sequenciaNavegacao) return;
      renderError(app, `Não foi possível carregar os planetas. (${err.message})`);
    }
    return;
  }

  if (view === "people") {
    renderLoading(app, "Buscando personagens na SWAPI…");
    try {
      if (!cache.people) cache.people = await getPeople();
      if (sequencia !== sequenciaNavegacao) return;
      renderPeopleView(app, cache.people, renderPersonModal, navigate);
    } catch (err) {
      if (sequencia !== sequenciaNavegacao) return;
      renderError(app, `Não foi possível carregar os personagens. (${err.message})`);
    }
    return;
  }

  if (view === "films") {
    renderLoading(app, "Buscando filmes na SWAPI…");
    try {
      if (!cache.films) cache.films = await getFilms();
      if (sequencia !== sequenciaNavegacao) return;
      renderFilmsView(app, cache.films, navigate);
    } catch (err) {
      if (sequencia !== sequenciaNavegacao) return;
      renderError(app, `Não foi possível carregar os filmes. (${err.message})`);
    }
    return;
  }

  if (view === "vehicles") {
    renderLoading(app, "Buscando naves e veículos na SWAPI…");
    try {
      const [starships, vehicles] = await Promise.all([
        cache.starships || getStarships(),
        cache.vehicles || getVehicles(),
      ]);
      if (sequencia !== sequenciaNavegacao) return;
      cache.starships = starships;
      cache.vehicles = vehicles;
      renderVehiclesView(app, { starships, vehicles }, navigate);
    } catch (err) {
      if (sequencia !== sequenciaNavegacao) return;
      renderError(app, `Não foi possível carregar naves e veículos. (${err.message})`);
    }
    return;
  }

  if (view === "trunfo") {
    renderLoading(app, "Buscando naves na SWAPI…");
    try {
      if (!cache.starships) cache.starships = await getStarships();
      if (sequencia !== sequenciaNavegacao) return;
      limparViewAtual = renderTrunfoView(app, cache.starships);
    } catch (err) {
      if (sequencia !== sequenciaNavegacao) return;
      renderError(app, `Não foi possível carregar as naves. (${err.message})`);
    }
    return;
  }

  if (view === "species") {
    renderLoading(app, "Buscando espécies na SWAPI…");
    try {
      if (!cache.species) cache.species = await getSpecies();
      if (sequencia !== sequenciaNavegacao) return;
      renderSpeciesView(app, cache.species, navigate);
    } catch (err) {
      if (sequencia !== sequenciaNavegacao) return;
      renderError(app, `Não foi possível carregar as espécies. (${err.message})`);
    }
  }
}

navButtons.forEach((b) => b.addEventListener("click", () => navigate(b.dataset.nav)));
document.querySelector(".brand").addEventListener("click", () => navigate("hub"));

/* Recarregou a página no meio de uma partida online do Super Trunfo: volta
   direto para ela, que a view reentra na mesma sala. */
navigate(lerSessaoSalva() ? "trunfo" : "hub");
