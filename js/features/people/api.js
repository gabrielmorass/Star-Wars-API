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
