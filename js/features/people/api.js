import { BASE_URL, fetchJSON } from "../../core/api.js";

export function getPeople() {
  return fetchJSON(`${BASE_URL}/people`);
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

export async function getPersonSpecies(person) {
  if (!person.species || person.species.length === 0) return "Human (implícito)";
  const species = await Promise.all(
    person.species.map((url) => fetchJSON(url).catch(() => null))
  );
  return species.filter(Boolean).map((s) => s.name).join(", ") || "Desconhecida";
}

/* ---------------- Mapas auxiliares ----------------
   Cada um faz UMA requisição, memorizada, e devolve um Map pronto para
   consulta síncrona. É o que permite a grade resolver espécie, filmes e
   naves sem uma requisição por card. */

let speciesMapPromise = null;

/* url da espécie → nome (ex.: ".../species/2" → "Droid") */
export function getSpeciesMap() {
  if (!speciesMapPromise) {
    speciesMapPromise = fetchJSON(`${BASE_URL}/species`)
      .then((list) => new Map(list.map((s) => [s.url, s.name])))
      .catch(() => new Map());
  }
  return speciesMapPromise;
}

let filmsMapPromise = null;

/* url do filme → { episode, title } */
export function getFilmsMap() {
  if (!filmsMapPromise) {
    filmsMapPromise = fetchJSON(`${BASE_URL}/films`)
      .then((list) => new Map(list.map((f) => [f.url, { episode: f.episode_id, title: f.title }])))
      .catch(() => new Map());
  }
  return filmsMapPromise;
}

let craftMapPromise = null;

/* url da nave/veículo → { name, kind } — kind casa com a aba da view
   Naves e Veículos ("starships" | "vehicles") */
export function getCraftMap() {
  if (!craftMapPromise) {
    craftMapPromise = Promise.all([
      fetchJSON(`${BASE_URL}/starships`).catch(() => []),
      fetchJSON(`${BASE_URL}/vehicles`).catch(() => []),
    ]).then(([starships, vehicles]) => {
      const map = new Map();
      starships.forEach((s) => map.set(s.url, { name: s.name, kind: "starships" }));
      vehicles.forEach((v) => map.set(v.url, { name: v.name, kind: "vehicles" }));
      return map;
    });
  }
  return craftMapPromise;
}

/* Nome curto da espécie, para pílula e filtro.
   A SWAPI deixa `species` vazio nos humanos — ver README (Decisões de dados). */
export function speciesNameOf(person, speciesMap) {
  if (!person.species || person.species.length === 0) return "Human";
  return person.species.map((url) => speciesMap.get(url) || "Desconhecida").join(", ");
}
