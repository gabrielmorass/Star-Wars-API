import { BASE_URL, fetchJSON } from "../../core/api.js";

export function getSpecies() {
  return fetchJSON(`${BASE_URL}/species`);
}
