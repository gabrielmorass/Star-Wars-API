import { fetchJSON } from "../../core/api.js";
import { API_BASE } from "../../config.js";

export function getSpecies() {
  return fetchJSON(`${API_BASE}/species?idioma=pt-BR`);
}
