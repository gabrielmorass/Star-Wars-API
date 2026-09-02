import { getPlanets, getPeople, getFilms, getStarships, getVehicles, getSpecies } from "./api.js";
import {
  renderHub,
  renderLoading,
  renderError,
  renderPlanetsView,
  renderPeopleView,
  renderPersonModal,
  renderFilmsView,
  renderVehiclesView,
  renderSpeciesView,
} from "./render.js";

const app = document.getElementById("app");
const navButtons = document.querySelectorAll(".topnav [data-nav]");

const cache = { planets: null, people: null, films: null, vehiclesData: null, species: null };

async function navigate(view) {
  navButtons.forEach((b) => b.classList.toggle("active", b.dataset.nav === view));

  if (view === "hub") {
    renderHub(app, navigate);
    return;
  }

  if (view === "planets") {
    renderLoading(app, "Buscando planetas na SWAPI…");
    try {
      if (!cache.planets) cache.planets = await getPlanets();
      renderPlanetsView(app, cache.planets);
    } catch (err) {
      renderError(app, `Não foi possível carregar os planetas. (${err.message})`);
    }
    return;
  }

  if (view === "people") {
    renderLoading(app, "Buscando personagens na SWAPI…");
    try {
      if (!cache.people) cache.people = await getPeople();
      renderPeopleView(app, cache.people, renderPersonModal);
    } catch (err) {
      renderError(app, `Não foi possível carregar os personagens. (${err.message})`);
    }
    return;
  }

  if (view === "films") {
    renderLoading(app, "Buscando filmes na SWAPI…");
    try {
      if (!cache.films) cache.films = await getFilms();
      renderFilmsView(app, cache.films);
    } catch (err) {
      renderError(app, `Não foi possível carregar os filmes. (${err.message})`);
    }
    return;
  }

  if (view === "vehicles") {
    renderLoading(app, "Buscando naves e veículos na SWAPI…");
    try {
      if (!cache.vehiclesData) {
        const [starships, vehicles] = await Promise.all([getStarships(), getVehicles()]);
        cache.vehiclesData = { starships, vehicles };
      }
      renderVehiclesView(app, cache.vehiclesData);
    } catch (err) {
      renderError(app, `Não foi possível carregar naves e veículos. (${err.message})`);
    }
    return;
  }

  if (view === "species") {
    renderLoading(app, "Buscando espécies na SWAPI…");
    try {
      if (!cache.species) cache.species = await getSpecies();
      renderSpeciesView(app, cache.species);
    } catch (err) {
      renderError(app, `Não foi possível carregar as espécies. (${err.message})`);
    }
  }
}

navButtons.forEach((b) => b.addEventListener("click", () => navigate(b.dataset.nav)));
document.querySelector(".brand").addEventListener("click", () => navigate("hub"));

navigate("hub");
