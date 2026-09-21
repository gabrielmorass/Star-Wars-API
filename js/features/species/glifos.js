/* Glifos de classificação e cores das espécies.
   ------------------------------------------------------------------
   A SWAPI descreve cada espécie por três coisas visuais: a classificação
   (mamífero, réptil, insectoide...), e as cores de pele, cabelo e olhos.
   Nenhuma delas vem como imagem. Este módulo transforma as duas em desenho:

   - um glifo de traço por classificação (8 no total), no mesmo espírito das
     silhuetas de Naves e Veículos: viewBox próprio, sem preenchimento,
     pathLength="100" para a animação de "desenhar" funcionar em qualquer
     forma;
   - um mapa de nome de cor da API para um valor CSS, que é o que permite
     mostrar as cores como amostras em vez de só listar palavras.

   A classificação chega em dez grafias ("mammal" e "mammals", "reptile" e
   "reptilian"), que colapsam em oito chaves. */

const CHAVE_POR_CLASSIFICACAO = {
  mammal: "mamifero",
  mammals: "mamifero",
  reptile: "reptil",
  reptilian: "reptil",
  amphibian: "anfibio",
  insectoid: "insectoide",
  gastropod: "gastropode",
  artificial: "artificial",
  sentient: "senciente",
};

export const NOME_GLIFO = {
  mamifero: "Mamíferos",
  reptil: "Répteis",
  anfibio: "Anfíbios",
  insectoide: "Insectoides",
  gastropode: "Gastrópodes",
  artificial: "Artificiais",
  senciente: "Sencientes",
  desconhecida: "Sem classificação",
};

export function glifoDe(classification) {
  const k = String(classification || "").trim().toLowerCase();
  return CHAVE_POR_CLASSIFICACAO[k] || "desconhecida";
}

/* Engrenagem gerada, não desenhada à mão: oito dentes iguais a olho é
   difícil, e o traço torto se nota num ícone de 96px. */
function engrenagem(dentes = 8, rInt = 11.5, rExt = 15.5, cx = 24, cy = 24) {
  const pts = [];
  const passo = (Math.PI * 2) / dentes;
  for (let i = 0; i < dentes; i++) {
    const a = i * passo;
    [
      [a - passo * 0.32, rInt],
      [a - passo * 0.17, rExt],
      [a + passo * 0.17, rExt],
      [a + passo * 0.32, rInt],
    ].forEach(([ang, r]) =>
      pts.push(`${(cx + Math.cos(ang) * r).toFixed(1)},${(cy + Math.sin(ang) * r).toFixed(1)}`)
    );
  }
  return `<polygon points="${pts.join(" ")}"/>`;
}

/* Todos em 48x48. A ordem dos elementos importa: a animação de desenhar
   atrasa cada filho um pouco mais que o anterior. */
const ARTE = {
  /* pata: almofada central e quatro dedos */
  mamifero: `
    <path d="M24 41c-6.5 0-11.5-4.2-11.5-9.2 0-4.4 5-8.3 11.5-8.3s11.5 3.9 11.5 8.3c0 5-5 9.2-11.5 9.2z"/>
    <ellipse cx="12.5" cy="19.5" rx="3.6" ry="4.6"/>
    <ellipse cx="20.5" cy="12" rx="3.6" ry="5"/>
    <ellipse cx="27.5" cy="12" rx="3.6" ry="5"/>
    <ellipse cx="35.5" cy="19.5" rx="3.6" ry="4.6"/>`,

  /* escamas: três fileiras de arcos, intercaladas */
  reptil: `
    <path d="M5 17a6.3 6.3 0 0 1 12.6 0a6.3 6.3 0 0 1 12.6 0a6.3 6.3 0 0 1 12.6 0"/>
    <path d="M11.3 27a6.3 6.3 0 0 1 12.6 0a6.3 6.3 0 0 1 12.6 0"/>
    <path d="M5 37a6.3 6.3 0 0 1 12.6 0a6.3 6.3 0 0 1 12.6 0a6.3 6.3 0 0 1 12.6 0"/>`,

  /* gota sobre a água */
  anfibio: `
    <path d="M24 5c6.2 8.4 10.2 13.6 10.2 19.6a10.2 10.2 0 0 1-20.4 0C13.8 18.6 17.8 13.4 24 5z"/>
    <path d="M6 40q4.5-3.4 9 0t9 0t9 0t9 0"/>`,

  /* colmeia com antenas */
  insectoide: `
    <polygon points="24,11 36.5,18.2 36.5,32.6 24,39.8 11.5,32.6 11.5,18.2"/>
    <polygon points="24,19 30,22.5 30,29.5 24,33 18,29.5 18,22.5"/>
    <path d="M19.5 11L13 3.5"/>
    <path d="M28.5 11L35 3.5"/>
    <circle cx="12.3" cy="2.8" r="1.4"/>
    <circle cx="35.7" cy="2.8" r="1.4"/>`,

  /* concha em espiral com o pé para a esquerda */
  gastropode: `
    <path d="M24 24a2 2 0 0 1 2 2a4 4 0 0 1-4 4a6 6 0 0 1-6-6a8 8 0 0 1 8-8a10 10 0 0 1 10 10a12 12 0 0 1-12 12"/>
    <path d="M22 38H9c-2.2 0-3.4-2.2-1.6-3.6L11 32"/>`,

  artificial: `
    ${engrenagem()}
    <circle cx="24" cy="24" r="5.5"/>`,

  /* olho: a designação "senciente" é sobre consciência, e o olhar é o
     símbolo mais direto disso */
  senciente: `
    <path d="M4 24q20-22 40 0q-20 22-40 0z"/>
    <circle cx="24" cy="24" r="8"/>
    <circle cx="24" cy="24" r="3"/>`,

  desconhecida: `
    <circle cx="24" cy="24" r="17"/>
    <path d="M18.5 19.5a5.5 5.5 0 1 1 8 4.9c-1.7.9-2.5 2-2.5 3.6"/>
    <circle cx="24" cy="33" r="1.2"/>`,
};

const COM_MEDIDA = /<(path|circle|ellipse|polygon|polyline|line)\b/g;

export function svgGlifo(chave, tamanho, extra = "") {
  const arte = (ARTE[chave] || ARTE.desconhecida).replace(COM_MEDIDA, '<$1 pathLength="100"');
  return `<svg class="sp-glifo-svg ${extra}" viewBox="0 0 48 48" width="${tamanho}" height="${tamanho}"
      fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
      stroke-linejoin="round" aria-hidden="true">${arte}</svg>`;
}

/* ---------------- Cores ----------------
   Nome de cor da SWAPI → valor CSS. As de pele humana ("caucasian",
   "asian", "hispanic") são tons de pele reais; as demais são a cor pelo
   nome. O que não estiver aqui vira só texto, sem amostra. */
const COR_HEX = {
  caucasian: "#f1c9a5",
  asian: "#e8c39e",
  hispanic: "#c68642",
  black: "#1f1f1f",
  dark: "#3b2a24",
  brown: "#7b4a2d",
  "brown mottle": "#8a6a4a",
  tan: "#d2b48c",
  fair: "#f6dcc4",
  light: "#f6dcc4",
  pale: "#f3e5d8",
  "pale pink": "#f8c8d8",
  peach: "#ffcba4",
  white: "#f5f5f5",
  gray: "#8e9299",
  grey: "#8e9299",
  "blue-gray": "#6b8ba4",
  silver: "#c0c0c0",
  metal: "#9aa3ad",
  green: "#4caf50",
  "green-tan": "#9aa86a",
  "mottled green": "#6b8e4e",
  mottled: "#8a8a6a",
  blue: "#3b82f6",
  indigo: "#4b0082",
  purple: "#7c3aed",
  magenta: "#d4269a",
  pink: "#f472b6",
  red: "#d62828",
  auburn: "#a0522d",
  orange: "#f97316",
  amber: "#ffbf00",
  yellow: "#f5d90a",
  gold: "#d4af37",
  golden: "#e5b80b",
  blond: "#e6c36a",
  blonde: "#e6c36a",
  hazel: "#8e7a3a",
};

export function corHex(nome) {
  return COR_HEX[String(nome || "").trim().toLowerCase()] || null;
}
