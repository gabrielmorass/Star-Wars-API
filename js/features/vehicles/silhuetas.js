/* Silhuetas de naves e veículos.
   ------------------------------------------------------------------
   A SWAPI tem 45 strings distintas de classe entre starship_class e
   vehicle_class — com duplicatas só de caixa ("Starfighter"/"starfighter",
   "Star Destroyer"/"star destroyer"). Não dá (nem vale) desenhar 45 naves;
   o que o card precisa é de leitura instantânea de "que tipo de coisa é
   essa". Daí 8 silhuetas genéricas e um mapa de classe → silhueta.

   Os desenhos são só de traço, num viewBox 48x48 comum, para que a mesma
   arte sirva ao ícone de 16px da pill, ao de 34px do card, ao cabeçalho de
   120px e à régua de tamanho sem virar borrão. A cor vem de fora, por
   currentColor, então acompanha o acento e o tema. */
/* Cada silhueta tem viewBox PRÓPRIO, com a proporção real da classe. É isso
   que separa um destróier (5,3:1 de perfil) de um caça (1:1 visto de cima) —
   num viewBox quadrado comum, todas acabavam com a mesma silhueta genérica.
   A vista de cada uma é a que melhor diferencia: de cima quando a asa é a
   assinatura, de lado quando o perfil é. */
const ARTE = {
  /* de cima — corpo fino, 4 asas em X, canhão na ponta de cada asa */
  caca: {
    vb: [56, 56],
    d: `
      <path d="M28 5 L31 20 L31 36 L28 51 L25 36 L25 20 Z"/>
      <path d="M25 21 L9 11 L7 15 L24 26"/>
      <path d="M31 21 L47 11 L49 15 L32 26"/>
      <path d="M25 35 L9 45 L7 41 L24 30"/>
      <path d="M31 35 L47 45 L49 41 L32 30"/>
      <path d="M8 12 L2 8"/>
      <path d="M48 12 L54 8"/>
      <path d="M8 44 L2 48"/>
      <path d="M48 44 L54 48"/>
      <circle cx="28" cy="22" r="3"/>`,
  },

  /* de cima — asa delta larga e curta, cockpit bem adiantado */
  interceptador: {
    vb: [64, 36],
    d: `
      <path d="M32 3 L60 30 L4 30 Z"/>
      <path d="M32 3 L32 30"/>
      <ellipse cx="32" cy="12" rx="4.4" ry="6.4"/>
      <path d="M14 30 L14 34 M50 30 L50 34"/>`,
  },

  /* de lado — cunha muito alongada, torre de comando na traseira */
  cruzador: {
    vb: [160, 30],
    d: `
      <path d="M4 23 L138 9 L156 15 L156 23 Z"/>
      <path d="M129 10 L129 3 L145 3 L145 8"/>
      <path d="M40 19.5 L122 11.5"/>
      <path d="M150 15 L150 23"/>`,
  },

  /* de cima — disco achatado, mandíbulas em garfo na frente, cabine ao lado */
  cargueiro: {
    vb: [64, 50],
    d: `
      <ellipse cx="35" cy="25" rx="25" ry="18"/>
      <path d="M13 15 L2 9 L13 20"/>
      <path d="M13 35 L2 41 L13 30"/>
      <path d="M50 34 L60 40 L55 44 L45 39"/>
      <circle cx="35" cy="25" r="6"/>`,
  },

  /* de frente — fuselagem vertical, duas asas grandes dobradas para baixo */
  transporte: {
    vb: [48, 64],
    d: `
      <path d="M24 4 L29 18 L29 40 L19 40 L19 18 Z"/>
      <path d="M29 20 L44 58 L36 58 L29 34"/>
      <path d="M19 20 L4 58 L12 58 L19 34"/>
      <path d="M19 40 L29 40 L31 60 L17 60 Z"/>`,
  },

  /* esfera, linha do equador e a cratera do prato */
  estacao: {
    vb: [56, 56],
    d: `
      <circle cx="28" cy="28" r="23"/>
      <path d="M5 28 L51 28"/>
      <circle cx="20" cy="18" r="7"/>`,
  },

  /* de lado — casco liso e comprido, proa arredondada, dois motores atrás */
  iate: {
    vb: [110, 28],
    d: `
      <path d="M4 14 Q4 5 26 5 L86 7 Q97 10 97 14 Q97 18 86 21 L26 23 Q4 23 4 14 Z"/>
      <rect x="97" y="7.5" width="10" height="5.5" rx="2.2"/>
      <rect x="97" y="15" width="10" height="5.5" rx="2.2"/>
      <path d="M30 11 L72 10"/>`,
  },

  /* de lado — casco baixo e comprido, aileron e dois bocais de repulsor */
  speeder: {
    vb: [80, 28],
    d: `
      <path d="M4 18 Q14 10 40 10 L66 13 Q76 15 74 20 L58 23 L12 23 Q4 22 4 18 Z"/>
      <path d="M40 10 L45 3 L53 3 L50 11"/>
      <rect x="12" y="23" width="14" height="4" rx="2"/>
      <rect x="46" y="23" width="14" height="4" rx="2"/>`,
  },

  /* de lado — cabine e quatro pernas articuladas */
  walker: {
    vb: [56, 60],
    d: `
      <path d="M14 8 L40 8 L46 18 L40 28 L14 28 L8 18 Z"/>
      <path d="M8 14 L1 11 M8 22 L1 25"/>
      <path d="M18 28 L13 40 L18 56 M26 28 L24 40 L18 52"/>
      <path d="M36 28 L41 40 L36 56 M28 28 L30 40 L36 52"/>`,
  },

  /* fallback: casco neutro, sem prometer categoria nenhuma */
  generico: {
    vb: [48, 48],
    d: `
      <path d="M24 5 L36 20 L32 40 L16 40 L12 20 Z"/>
      <circle cx="24" cy="22" r="4.4"/>
      <path d="M16 40 L14 45 M32 40 L34 45"/>`,
  },
};

export const NOME_SILHUETA = {
  caca: "Caça",
  interceptador: "Interceptador",
  cruzador: "Cruzador",
  cargueiro: "Cargueiro",
  transporte: "Transporte",
  estacao: "Estação",
  iate: "Iate",
  speeder: "Speeder",
  walker: "Walker",
  generico: "Outra classe",
};

/* Classe (em minúsculas) → silhueta. As chaves cobrem as 45 strings da base;
   o que não casar exato cai nas regras por palavra em `silhuetaDe`. */
const POR_CLASSE = {
  /* caças e interceptadores */
  starfighter: "caca",
  "assault starfighter": "caca",
  "droid starfighter": "caca",
  "patrol craft": "interceptador",
  "escort ship": "interceptador",
  "space/planetary bomber": "caca",
  gunship: "caca",

  /* linha de frente */
  "star destroyer": "cruzador",
  "star dreadnought": "cruzador",
  "star cruiser": "cruzador",
  "space cruiser": "cruzador",
  cruiser: "cruzador",
  corvette: "cruzador",
  "capital ship": "cruzador",
  "assault ship": "cruzador",
  "droid control ship": "cruzador",

  /* carga */
  freighter: "cargueiro",
  "light freighter": "cargueiro",
  "medium transport": "cargueiro",
  "repulsorcraft cargo skiff": "cargueiro",

  /* transporte e pouso */
  transport: "transporte",
  "space transport": "transporte",
  "armed government transport": "transporte",
  "landing craft": "transporte",
  "sail barge": "transporte",
  "fire suppression ship": "transporte",

  /* iate */
  yacht: "iate",
  "diplomatic barge": "iate",

  /* estação */
  "deep space mobile battlestation": "estacao",

  /* repulsores */
  speeder: "speeder",
  "air speeder": "speeder",
  airspeeder: "speeder",
  repulsorcraft: "speeder",
  submarine: "speeder",

  /* pernas e lagartas */
  walker: "walker",
  "assault walker": "walker",
  "wheeled walker": "walker",
  "droid tank": "walker",
  wheeled: "walker",
};

/* Se a classe exata não estiver no mapa, decide por palavra-chave. Ordem
   importa: "assault walker" tem que bater walker antes de assault. */
const POR_PALAVRA = [
  ["walker", "walker"],
  ["tank", "walker"],
  ["wheeled", "walker"],
  ["speeder", "speeder"],
  ["repulsor", "speeder"],
  ["battlestation", "estacao"],
  ["station", "estacao"],
  ["dreadnought", "cruzador"],
  ["destroyer", "cruzador"],
  ["cruiser", "cruzador"],
  ["corvette", "cruzador"],
  ["capital", "cruzador"],
  ["freighter", "cargueiro"],
  ["cargo", "cargueiro"],
  ["barge", "transporte"],
  ["transport", "transporte"],
  ["shuttle", "transporte"],
  ["landing", "transporte"],
  ["yacht", "iate"],
  ["bomber", "caca"],
  ["gunship", "caca"],
  ["fighter", "caca"],
  ["interceptor", "interceptador"],
  ["patrol", "interceptador"],
  ["escort", "interceptador"],
];

/** Classe crua da SWAPI → chave de silhueta. Nunca devolve vazio. */
export function silhuetaDe(classe) {
  const k = String(classe || "").trim().toLowerCase();
  if (!k) return "generico";
  if (POR_CLASSE[k]) return POR_CLASSE[k];
  for (const [palavra, chave] of POR_PALAVRA) {
    if (k.includes(palavra)) return chave;
  }
  return "generico";
}

/**
 * SVG da silhueta, em traço, herdando a cor de quem chama.
 * @param {string} chave  saída de silhuetaDe()
 * @param {number} tamanho  lado em px
 */
/* `pathLength="100"` normaliza o comprimento de cada traço: com ele, um
   stroke-dasharray de 100 cobre a forma inteira seja ela qual for, e a
   animação de "desenhar" do cabeçalho é uma linha de CSS em vez de medir
   cada path com getTotalLength(). */
const COM_MEDIDA = /<(path|circle|ellipse|rect|line|polyline|polygon)\b/g;

/** Arte crua de uma classe: usada pelo painel de escala real, que precisa
 *  posicionar e escalar o desenho por conta própria. */
export function arteDe(chave) {
  return ARTE[chave] || ARTE.generico;
}

/**
 * SVG da silhueta, em traço, herdando a cor de quem chama.
 * `tamanho` é o LADO MAIOR: como cada classe tem proporção própria, um
 * destróier em "34px" sai 34x6 e um shuttle sai 26x34. É essa diferença de
 * formato que faz a leitura ser instantânea na grade.
 */
export function svgSilhueta(chave, tamanho, extra = "") {
  const { vb, d } = arteDe(chave);
  const [vw, vh] = vb;
  const escala = tamanho / Math.max(vw, vh);
  const arte = d.replace(COM_MEDIDA, '<$1 pathLength="100"');
  return `<svg class="sil ${extra}" viewBox="0 0 ${vw} ${vh}"
    width="${Math.round(vw * escala)}" height="${Math.round(vh * escala)}"
    fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"
    stroke-linecap="round" aria-hidden="true" focusable="false">${arte}</svg>`;
}
