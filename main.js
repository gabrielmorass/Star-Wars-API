import { getPlanets, getPeople } from "./api.js";
import {
  renderHub,
  renderLoading,
  renderError,
  renderPlanetsView,
  renderPeopleView,
  renderPersonModal,
} from "./render.js";

const app = document.getElementById("app");
const navButtons = document.querySelectorAll(".topnav [data-nav]");

const cache = { planets: null, people: null };

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
  }
}

navButtons.forEach((b) => b.addEventListener("click", () => navigate(b.dataset.nav)));
document.querySelector(".brand").addEventListener("click", () => navigate("hub"));

navigate("hub");
