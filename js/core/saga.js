/* ---------------- Cronologia da saga ----------------
   A SWAPI não traz o ano interno de cada filme: o recurso `films` só tem
   `release_date`, que é a estreia no nosso mundo. Os anos abaixo, na
   contagem relativa à Batalha de Yavin, são ESCOLHA DA EQUIPE — ver README
   (Decisões de dados). Ficam num módulo só para a linha do tempo de
   Personagens e a barra de cronologia de Filmes não divergirem. */

export const ANOS_FILMES = [
  { ep: 1, romano: "I", ano: -32 },
  { ep: 2, romano: "II", ano: -22 },
  { ep: 3, romano: "III", ano: -19 },
  { ep: 4, romano: "IV", ano: 0 },
  { ep: 5, romano: "V", ano: 3 },
  { ep: 6, romano: "VI", ano: 4 },
];

const PORE = new Map(ANOS_FILMES.map((f) => [f.ep, f]));

export function anoDoEpisodio(id) {
  return PORE.get(Number(id))?.ano ?? null;
}

export function romanoDe(id) {
  return PORE.get(Number(id))?.romano ?? String(id);
}
