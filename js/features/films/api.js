import { BASE_URL, fetchJSON } from "../../core/api.js";

export function getFilms() {
  return fetchJSON(`${BASE_URL}/films`);
}
