import { BASE_URL, fetchJSON } from "../../core/api.js";

export function getFilms() {
  return fetchJSON(`${BASE_URL}/films`);
}

/* ---------------- Mapas para as abas do modal ----------------
   Cada aba do modal (Elenco, Planetas, Naves, Espécies) precisa resolver uma
   lista de urls em nomes. Resolver url a url daria dezenas de requisições
   por filme; aqui cada recurso é buscado UMA vez, memorizado, e devolvido
   como Map pronto para consulta síncrona. A aba só dispara a busca quando é
   aberta pela primeira vez — daí o cache ser por promessa, e não por valor:
   duas aberturas seguidas compartilham a mesma requisição em voo. */

function mapaPorUrl(caminho) {
  let promessa = null;
  return () => {
    if (!promessa) {
      promessa = fetchJSON(`${BASE_URL}/${caminho}`)
        .then((lista) => new Map(lista.map((item) => [item.url, item])))
        .catch(() => new Map());
    }
    return promessa;
  };
}

export const getPeopleMap = mapaPorUrl("people");
export const getPlanetsMap = mapaPorUrl("planets");
export const getSpeciesFullMap = mapaPorUrl("species");

let navesPromise = null;

/* url da nave/veículo → { name, kind } — kind casa com a aba da view
   Naves e Veículos ("starships" | "vehicles") */
export function getNavesMap() {
  if (!navesPromise) {
    navesPromise = Promise.all([
      fetchJSON(`${BASE_URL}/starships`).catch(() => []),
      fetchJSON(`${BASE_URL}/vehicles`).catch(() => []),
    ]).then(([starships, vehicles]) => {
      const map = new Map();
      starships.forEach((s) => map.set(s.url, { name: s.name, kind: "starships" }));
      vehicles.forEach((v) => map.set(v.url, { name: v.name, kind: "vehicles" }));
      return map;
    });
  }
  return navesPromise;
}
