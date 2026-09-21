/* Vocabulário da SWAPI em português.
   ------------------------------------------------------------------
   A regra do projeto, em uma linha: **nome próprio fica em inglês, valor de
   atributo é traduzido.**

   "Luke Skywalker", "Tatooine", "Millennium Falcon" e "Shyriiwook" são nomes
   — traduzir descaracterizaria o dado e quebraria a busca, que casa pelo que
   a API devolve. Já `arid`, `male`, `gastropod` e `bogs` não são nomes: são
   vocabulário controlado, com uma dúzia de valores possíveis, e aparecem
   colados em rótulos portugueses ("Clima", "Classificação"). Esses traduzem.

   Este módulo é a fonte única desses dicionários. Antes eles moravam dentro
   de people/view.js e só Personagens se beneficiava; Planetas e Espécies
   mostravam o valor cru ao lado do rótulo em português. */

export const VAZIO = new Set(["unknown", "n/a", "none", ""]);

export const GENERO = {
  male: "masculino",
  female: "feminino",
  hermaphrodite: "hermafrodita",
  "n/a": "não se aplica",
  none: "nenhum",
  unknown: "desconhecido",
};

export const CORES = {
  blue: "azul",
  "blue-gray": "azul-acinzentado",
  red: "vermelho",
  "red, blue": "vermelho e azul",
  white: "branco",
  brown: "castanho",
  "brown mottle": "castanho malhado",
  black: "preto",
  blond: "loiro",
  blonde: "loiro",
  auburn: "ruivo",
  grey: "cinza",
  gray: "cinza",
  green: "verde",
  "green-tan": "verde-bege",
  yellow: "amarelo",
  orange: "laranja",
  pink: "rosa",
  gold: "dourado",
  silver: "prateado",
  tan: "bege",
  fair: "clara",
  light: "clara",
  dark: "escura",
  pale: "pálida",
  mottled: "malhada",
  "mottled green": "verde malhada",
  metal: "metálica",
  "white, blue": "branco e azul",
  hazel: "castanho-esverdeado",
  /* tons de pele e cores que só aparecem em Espécies */
  caucasian: "caucasiana",
  asian: "asiática",
  hispanic: "hispânica",
  peach: "pêssego",
  "pale pink": "rosa-claro",
  magenta: "magenta",
  purple: "roxa",
  indigo: "índigo",
  amber: "âmbar",
  golden: "dourado",
  none: "nenhum",
  unknown: "desconhecido",
  "n/a": "não se aplica",
};

/* Clima — 17 valores na base. "artic" e "subartic" estão escritos assim na
   SWAPI mesmo (sem o primeiro "c"); as duas grafias entram para o dado não
   escapar do dicionário. */
export const CLIMA = {
  arid: "árido",
  artic: "ártico",
  arctic: "ártico",
  subartic: "subártico",
  subarctic: "subártico",
  "artificial temperate": "temperado artificial",
  frigid: "glacial",
  frozen: "congelado",
  hot: "quente",
  humid: "úmido",
  moist: "úmido",
  murky: "turvo",
  polluted: "poluído",
  rocky: "rochoso",
  superheated: "superaquecido",
  temperate: "temperado",
  tropical: "tropical",
  windy: "ventoso",
  unknown: "desconhecido",
  "n/a": "não se aplica",
  none: "nenhum",
};

/* Terreno — o campo vem como lista ("mountains, grasslands"), e a SWAPI mistura
   singular e plural para a mesma coisa (desert/deserts, swamp/swamps). Como o
   texto aparece sempre em enumeração, tudo sai no plural em português, e as
   duas grafias de origem apontam para a mesma saída. */
export const TERRENO = {
  "acid pools": "poças de ácido",
  "airless asteroid": "asteroide sem atmosfera",
  ash: "cinzas",
  barren: "ermo",
  bogs: "charcos",
  canyons: "desfiladeiros",
  caves: "cavernas",
  cities: "cidades",
  cityscape: "área urbana",
  cliffs: "penhascos",
  desert: "desertos",
  deserts: "desertos",
  fields: "campos",
  forests: "florestas",
  "fungus forests": "florestas de fungos",
  "gas giant": "gigante gasoso",
  glaciers: "geleiras",
  grass: "campos de relva",
  grasslands: "pradarias",
  "grassy hills": "colinas relvadas",
  hills: "colinas",
  "ice canyons": "desfiladeiros de gelo",
  "ice caves": "cavernas de gelo",
  islands: "ilhas",
  jungle: "selvas",
  jungles: "selvas",
  lakes: "lagos",
  "lava rivers": "rios de lava",
  mesas: "mesetas",
  mountain: "montanhas",
  mountains: "montanhas",
  "mountain ranges": "cordilheiras",
  ocean: "oceanos",
  oceans: "oceanos",
  plains: "planícies",
  plateaus: "planaltos",
  rainforests: "florestas tropicais",
  reefs: "recifes",
  rivers: "rios",
  rock: "rochedos",
  rocky: "rochedos",
  "rock arches": "arcos rochosos",
  "rocky canyons": "desfiladeiros rochosos",
  "rocky deserts": "desertos rochosos",
  "rocky islands": "ilhas rochosas",
  savanna: "savanas",
  savannah: "savanas",
  savannahs: "savanas",
  savannas: "savanas",
  scrublands: "matagais",
  seas: "mares",
  sinkholes: "dolinas",
  swamp: "pântanos",
  swamps: "pântanos",
  "toxic cloudsea": "mar de nuvens tóxicas",
  tundra: "tundra",
  urban: "área urbana",
  valleys: "vales",
  verdant: "vegetação densa",
  vines: "cipoais",
  volcanoes: "vulcões",
  unknown: "desconhecido",
  "n/a": "não se aplica",
  none: "nenhum",
};

/* Classificação e designação de espécie. A SWAPI usa mammal e mammals,
   reptile e reptilian para o mesmo grupo. */
export const CLASSIFICACAO = {
  amphibian: "anfíbio",
  artificial: "artificial",
  gastropod: "gastrópode",
  insectoid: "insectoide",
  mammal: "mamífero",
  mammals: "mamífero",
  reptile: "réptil",
  reptilian: "reptiliano",
  sentient: "senciente",
  unknown: "desconhecida",
  "n/a": "não se aplica",
  none: "nenhuma",
};

export const DESIGNACAO = {
  sentient: "senciente",
  reptilian: "reptiliano",
  unknown: "desconhecida",
  "n/a": "não se aplica",
  none: "nenhuma",
};

/* Classe de nave e de veículo. São 45 strings distintas na base, com
   duplicatas só de caixa ("Starfighter"/"starfighter"), então a chave é
   sempre minúscula.

   Duas ficam em inglês de propósito: "speeder" e "walker" são termos da
   própria saga, usados assim em português — traduzir viraria invenção. */
export const CLASSE_NAVE = {
  "armed government transport": "transporte governamental armado",
  "assault ship": "nave de assalto",
  "assault starfighter": "caça de assalto",
  "assault walker": "walker de assalto",
  "air speeder": "speeder aéreo",
  airspeeder: "speeder aéreo",
  "capital ship": "nave capital",
  corvette: "corveta",
  cruiser: "cruzador",
  "deep space mobile battlestation": "estação de batalha móvel",
  "diplomatic barge": "barca diplomática",
  "droid control ship": "nave de controle de dróides",
  "droid starfighter": "caça dróide",
  "droid tank": "tanque dróide",
  "escort ship": "nave de escolta",
  "fire suppression ship": "nave de combate a incêndio",
  freighter: "cargueiro",
  gunship: "nave de ataque",
  "landing craft": "nave de desembarque",
  "light freighter": "cargueiro leve",
  "medium transport": "transporte médio",
  "patrol craft": "nave de patrulha",
  repulsorcraft: "repulsor",
  "repulsorcraft cargo skiff": "barcaça repulsora de carga",
  "sail barge": "barca à vela",
  "space cruiser": "cruzador espacial",
  "space transport": "transporte espacial",
  "space/planetary bomber": "bombardeiro",
  speeder: "speeder",
  "star cruiser": "cruzador estelar",
  "star destroyer": "destróier estelar",
  "star dreadnought": "encouraçado estelar",
  starfighter: "caça",
  submarine: "submarino",
  transport: "transporte",
  walker: "walker",
  wheeled: "veículo sobre rodas",
  "wheeled walker": "walker sobre rodas",
  yacht: "iate",
};

/** Classe crua → português. Classe fora do dicionário volta como veio. */
export function classeDeNave(valor) {
  const bruto = String(valor || "").trim();
  if (!bruto) return "";
  const t = CLASSE_NAVE[bruto.toLowerCase()];
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : bruto;
}

/* Consumíveis (autonomia) vêm como texto livre em inglês: "2 months",
   "15 hours", "500 days", e um caso solto de "Live food tanks". */
const UNIDADE_TEMPO = {
  hour: ["hora", "horas"],
  day: ["dia", "dias"],
  week: ["semana", "semanas"],
  month: ["mês", "meses"],
  year: ["ano", "anos"],
};

export function duracao(valor) {
  if (valor === undefined || valor === null) return "desconhecida";
  const bruto = String(valor).trim();
  const chave = bruto.toLowerCase();
  if (VAZIO.has(chave) || chave === "0") return "desconhecida";
  if (chave === "live food tanks") return "tanques de comida viva";

  const m = chave.match(/^(\d+(?:[.,]\d+)?)\s+([a-z]+?)s?$/);
  if (!m) return bruto;
  const par = UNIDADE_TEMPO[m[2]];
  if (!par) return bruto;

  const n = Number(m[1].replace(",", "."));
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? par[0] : par[1]}`;
}

/* Nome de língua é nome próprio e não se traduz. O que dá para arrumar é a
   sujeira: "Galactic Basic" aparece em três grafias na base, uma delas com
   erro de digitação ("Galatic"). */
const LINGUA_CANONICA = {
  "galactic basic": "Galactic Basic",
  "galatic basic": "Galactic Basic",
  "gungan basic": "Gungan Basic",
};

export function normalizarLingua(valor) {
  if (valor === undefined || valor === null) return "desconhecida";
  const bruto = String(valor).trim();
  const chave = bruto.toLowerCase();
  if (VAZIO.has(chave)) return "desconhecida";
  if (LINGUA_CANONICA[chave]) return LINGUA_CANONICA[chave];
  /* alguns nomes vêm em minúscula ("besalisk", "vulpterish") */
  return bruto.charAt(0).toUpperCase() + bruto.slice(1);
}

/**
 * Traduz um valor da SWAPI usando o dicionário dado.
 * Aceita valores compostos ("brown, grey", "green-tan", "mountains, lakes"),
 * traduzindo peça por peça e devolvendo o que não conhece como veio — assim
 * um valor novo na API aparece em inglês, mas aparece, em vez de sumir.
 */
export function traduzir(valor, dicionario) {
  if (valor === undefined || valor === null) return "desconhecido";
  const bruto = String(valor).trim();
  const chave = bruto.toLowerCase();
  if (VAZIO.has(chave)) return dicionario[chave] || "desconhecido";
  if (dicionario[chave]) return dicionario[chave];
  return bruto
    .split(",")
    .map((parte) => {
      const t = parte.trim();
      const k = t.toLowerCase();
      if (dicionario[k]) return dicionario[k];
      const hifen = t.split("-").map((x) => dicionario[x.trim().toLowerCase()] || x.trim());
      return hifen.join("-");
    })
    .join(", ");
}

/* "unknown" / "n/a" da SWAPI viram texto legível, sem traduzir o resto */
export function legivel(valor) {
  if (valor === undefined || valor === null) return "desconhecido";
  const v = String(valor).trim().toLowerCase();
  return VAZIO.has(v) ? "desconhecido" : String(valor);
}
