// Camada de acesso à SWAPI (https://swapi.info/documentation).
// A base é servida como JSON estático via CDN: sem autenticação,
// sem paginação (cada endpoint devolve a lista completa) e sem
// suporte a parâmetros de busca no servidor.

export const BASE_URL = "https://swapi.info/api";

export async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao buscar ${url}: HTTP ${response.status}`);
  }
  return response.json();
}

export function getResource(url) {
  return fetchJSON(url);
}

// Usado por mais de uma feature (Personagens e Espécies resolvem o
// planeta natal), por isso fica no core em vez de dentro de uma delas.
export async function getPlanetName(url) {
  if (!url) return "Desconhecido";
  try {
    const planet = await fetchJSON(url);
    return planet.name;
  } catch {
    return "Desconhecido";
  }
}
