// Camada de acesso à SWAPI (https://swapi.info/documentation).
// A base é servida como JSON estático via CDN: sem autenticação,
// sem paginação (cada endpoint devolve a lista completa) e sem
// suporte a parâmetros de busca no servidor.

const BASE_URL = "https://swapi.info/api";

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao buscar ${url}: HTTP ${response.status}`);
  }
  return response.json();
}

export function getPlanets() {
  return fetchJSON(`${BASE_URL}/planets`);
}

export function getPeople() {
  return fetchJSON(`${BASE_URL}/people`);
}

export function getStarships() {
  return fetchJSON(`${BASE_URL}/starships`);
}

export function getVehicles() {
  return fetchJSON(`${BASE_URL}/vehicles`);
}

export function getResource(url) {
  return fetchJSON(url);
}

// A SWAPI não fornece fotos. Usamos o dataset público akabab/starwars-api
// (hospedado no GitHub, fora da SWAPI) só para casar nomes de personagens
// com uma URL de imagem. Casamos por nome normalizado, não por ID — as
// duas bases têm contagens diferentes de registros (82 vs. 87) e não
// garantem a mesma numeração.
const PORTRAITS_URL = "https://raw.githubusercontent.com/akabab/starwars-api/master/api/all.json";
let portraitsPromise = null;

export function getPortraits() {
  if (!portraitsPromise) {
    portraitsPromise = fetchJSON(PORTRAITS_URL)
      .then((list) => new Map(list.map((p) => [p.name.trim().toLowerCase(), p.image])))
      .catch(() => new Map());
  }
  return portraitsPromise;
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

export async function getPersonSpecies(person) {
  if (!person.species || person.species.length === 0) return "Human (implícito)";
  const species = await Promise.all(
    person.species.map((url) => fetchJSON(url).catch(() => null))
  );
  return species.filter(Boolean).map((s) => s.name).join(", ") || "Desconhecida";
}

export async function getPlanetName(url) {
  if (!url) return "Desconhecido";
  try {
    const planet = await fetchJSON(url);
    return planet.name;
  } catch {
    return "Desconhecido";
  }
}
