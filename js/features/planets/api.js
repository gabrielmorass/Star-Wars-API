import { BASE_URL, fetchJSON } from "../../core/api.js";

export function getPlanets() {
  return fetchJSON(`${BASE_URL}/planets`);
}

/**
 * A SWAPI não expõe "espécies do planeta" diretamente — não existe
 * um campo planet.species. Derivamos isso buscando cada morador
 * (resident) do planeta e coletando as espécies únicas encontradas
 * a partir do campo person.species.
 *
 * Residentes com species=[] são, por convenção da própria SWAPI,
 * humanos (a espécie "Human" raramente é referenciada explicitamente).
 */
export async function getPlanetSpecies(planet) {
  if (!planet.residents || planet.residents.length === 0) {
    return [];
  }

  const residents = await Promise.all(
    planet.residents.map((url) => fetchJSON(url).catch(() => null))
  );

  const speciesUrls = new Set();
  let hasImplicitHuman = false;

  residents.forEach((person) => {
    if (!person) return;
    if (person.species && person.species.length > 0) {
      person.species.forEach((s) => speciesUrls.add(s));
    } else {
      hasImplicitHuman = true;
    }
  });

  const speciesList = await Promise.all(
    [...speciesUrls].map((url) => fetchJSON(url).catch(() => null))
  );

  const names = speciesList.filter(Boolean).map((s) => s.name);
  if (hasImplicitHuman && !names.includes("Human")) {
    names.push("Human (implícito)");
  }

  return [...new Set(names)];
}

/**
 * A SWAPI não tem um recurso de "eventos". O melhor proxy disponível
 * é a lista de filmes em que o planeta aparece — tratamos isso como
 * "principais acontecimentos" na interface.
 */
export async function getPlanetFilms(planet) {
  if (!planet.films || planet.films.length === 0) return [];

  const films = await Promise.all(
    planet.films.map((url) => fetchJSON(url).catch(() => null))
  );

  return films
    .filter(Boolean)
    .sort((a, b) => a.episode_id - b.episode_id)
    .map((f) => ({ title: f.title, episode: f.episode_id }));
}
