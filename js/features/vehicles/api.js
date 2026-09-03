import { BASE_URL, fetchJSON } from "../../core/api.js";

export function getStarships() {
  return fetchJSON(`${BASE_URL}/starships`);
}

export function getVehicles() {
  return fetchJSON(`${BASE_URL}/vehicles`);
}
