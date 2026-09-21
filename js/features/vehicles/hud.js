/* HUD de Naves e Veículos: leitura dos números da SWAPI, medidores em arco,
   radar e régua logarítmica. Tudo SVG gerado em código, sem dependência.

   ---------------------------------------------------------------------
   Por que a normalização de algumas métricas é logarítmica
   ---------------------------------------------------------------------
   A ideia de normalizar pelo máximo da categoria só funciona quando a
   distribuição é razoável. Medindo a base:

       métrica            máx / mediana (naves)
       max_atmosphering_speed        8
       MGLT                          2
       hyperdrive_rating             6
       cargo_capacity           12.500.000
       crew                         68.591
       passengers                   11.245
       cost_in_credits           3.571.429

   A Death Star tem 1 trilhão de créditos e de carga; a Executor tem 342 mil
   tripulantes. Numa régua linear contra o máximo, 25 das 29 naves com carga
   conhecida ficariam com o arco visualmente em zero — o medidor não
   informaria nada.

   Então: linear onde a escala se comporta (velocidade, MGLT, hiperdrive) e
   logarítmica nas quatro de cauda pesada. O teto continua sendo o máximo da
   categoria corrente, como pedido; o que muda é a curva entre 0 e o teto. */

export const ESCALA_LOG = new Set([
  "cargo_capacity",
  "crew",
  "passengers",
  "cost_in_credits",
]);

/* ---------------- Leitura dos números ----------------
   A SWAPI mistura formatos no mesmo campo: "1,600" (vírgula de milhar),
   "12.5" (ponto decimal), "10.4 " (espaço sobrando), "1000km" (com unidade),
   "30-165" (intervalo de tripulação), além de "unknown", "n/a" e "none". */
export function numeroDe(valor) {
  if (valor === undefined || valor === null) return null;
  const bruto = String(valor).trim().toLowerCase();
  if (!bruto || bruto === "unknown" || bruto === "n/a" || bruto === "none") return null;

  /* "30-165": usa o topo do intervalo, que é a lotação real da nave */
  const faixa = bruto.match(/^([\d.,]+)\s*-\s*([\d.,]+)$/);
  const alvo = faixa ? faixa[2] : bruto;

  /* vírgula é separador de milhar nesta base ("1,600"), ponto é decimal */
  const limpo = alvo.replace(/,/g, "");
  const m = limpo.match(/^(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function formatar(valor, casas = 0) {
  const n = numeroDe(valor);
  if (n === null) return "desconhecido";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

/* Dentro de um arco de 100px não cabe "1.000.000.000.000". O número vira
   "1 tri" ali e o valor cheio fica logo abaixo e no title. */
const DEGRAUS = [
  [1e12, "tri"],
  [1e9, "bi"],
  [1e6, "mi"],
  [1e3, "mil"],
];

export function compacto(valor, casas = 0) {
  const n = numeroDe(valor);
  if (n === null) return { num: "—", sufixo: "" };
  for (const [corte, sufixo] of DEGRAUS) {
    if (n >= corte) {
      const v = n / corte;
      /* uma casa só enquanto o número é curto: 1,5 mi, mas 150 mi */
      const d = v >= 100 ? 0 : v >= 10 ? 0 : 1;
      const txt = v.toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: d,
      });
      return { num: txt, sufixo };
    }
  }
  return {
    num: n.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: casas,
    }),
    sufixo: "",
  };
}

/**
 * Normaliza para 0..1 contra o teto da categoria.
 * @param {number|null} n
 * @param {number} teto  maior valor da categoria corrente
 * @param {boolean} log  usa escala logarítmica (métricas de cauda pesada)
 * @param {boolean} inverso  menor é melhor (classe de hiperdrive)
 */
export function normalizar(n, teto, { log = false, inverso = false, piso = 0 } = {}) {
  if (n === null || !Number.isFinite(teto) || teto <= 0) return 0;
  let t;
  if (log) {
    /* +1 para o zero não virar -Infinity e para o mínimo não colar no fundo */
    t = Math.log10(n + 1) / Math.log10(teto + 1);
  } else if (inverso) {
    /* hiperdrive: 0.5 é melhor que 6. Mapeia [piso, teto] invertido. */
    t = (teto - n) / (teto - piso || 1);
  } else {
    t = n / teto;
  }
  return Math.max(0, Math.min(1, t));
}

/* ---------------- Medidor em arco ----------------
   Arco de 240° aberto para baixo. O preenchimento é stroke-dasharray sobre o
   mesmo path do trilho, então trilho e agulha nunca saem de registro. */
const R = 38;
const CX = 50;
const CY = 52;
export const COMPRIMENTO_ARCO = (2 * Math.PI * R * 240) / 360;

function ponto(graus) {
  const rad = (graus * Math.PI) / 180;
  return [CX + R * Math.cos(rad), CY + R * Math.sin(rad)];
}

const [AX, AY] = ponto(150);
const [BX, BY] = ponto(30);
const CAMINHO = `M${AX.toFixed(2)} ${AY.toFixed(2)} A${R} ${R} 0 1 1 ${BX.toFixed(2)} ${BY.toFixed(2)}`;

/* Cinco marcas: 0, 1/4, 1/2, 3/4 e 1. Antes eram nove e viravam ruído. */
function ticks() {
  let s = "";
  for (let i = 0; i <= 4; i++) {
    const g = 150 + (240 / 4) * i;
    const rad = (g * Math.PI) / 180;
    const r1 = R + 5;
    const r2 = R + 10;
    s += `<line x1="${(CX + r1 * Math.cos(rad)).toFixed(2)}" y1="${(CY + r1 * Math.sin(rad)).toFixed(2)}"
                x2="${(CX + r2 * Math.cos(rad)).toFixed(2)}" y2="${(CY + r2 * Math.sin(rad)).toFixed(2)}"
                class="hud-tick"/>`;
  }
  return s;
}

const TICKS = ticks();

/**
 * Um medidor. Só é chamado para métrica COM valor numérico — "desconhecido"
 * não vira arco vazio, vira uma linha de texto (ver `linhaSemValor`).
 */
export function medidor({ rotulo, bruto, unidade = "", fracao, indice = 0, vencedor = null, casas = 0 }) {
  const cheio = (COMPRIMENTO_ARCO * fracao).toFixed(2);
  const { num, sufixo } = compacto(bruto, casas);
  const completo = formatar(bruto, casas);
  const titulo = `${rotulo}: ${completo}${unidade ? ` ${unidade}` : ""}`;
  const marca =
    vencedor === null
      ? ""
      : `<span class="hud-vs ${vencedor ? "hud-vs--ganha" : "hud-vs--perde"}"
             aria-hidden="true">${vencedor ? "\u25b2" : "\u25bc"}</span>`;

  return `
    <div class="hud-med" style="--i:${indice}" title="${titulo}">
      <div class="hud-dial">
        <svg viewBox="0 0 100 76" class="hud-arco" aria-hidden="true" focusable="false">
          ${TICKS}
          <path d="${CAMINHO}" class="hud-trilho"/>
          <path d="${CAMINHO}" class="hud-cheio"
                style="--arco:${COMPRIMENTO_ARCO.toFixed(2)}; --cheio:${cheio}"/>
        </svg>
        <span class="hud-num">
          <b>${num}</b>${sufixo ? `<i class="hud-mult">${sufixo}</i>` : ""}
        </span>
      </div>
      <span class="hud-cheio-txt">${completo}${unidade ? `<i>${unidade}</i>` : ""}</span>
      <span class="hud-rotulo">${rotulo}${marca}</span>
    </div>`;
}

/** Métrica sem valor numérico: uma linha discreta, fora da grade de arcos. */
export function linhaSemValor(rotulo) {
  return `<li class="hud-sem"><span>${rotulo}</span>desconhecida</li>`;
}

/* ---------------- Radar de 5 eixos ---------------- */
const EIXOS = ["Velocidade", "Hiperdrive", "Carga", "Tripulação", "Custo"];
const RC = 50;
const RR = 34;

function vertice(i, frac, total = EIXOS.length) {
  /* começa no topo e anda no sentido horário */
  const ang = (-90 + (360 / total) * i) * (Math.PI / 180);
  return [RC + RR * frac * Math.cos(ang), RC + RR * frac * Math.sin(ang)];
}

function poligono(fracoes, classe) {
  const pts = fracoes.map((f, i) => vertice(i, f).map((n) => n.toFixed(2)).join(","));
  return `<polygon points="${pts.join(" ")}" class="${classe}"/>`;
}

/**
 * @param {number[]} a  5 frações 0..1 (item principal)
 * @param {number[]|null} b  5 frações do comparado, ou null
 */
export function radar(a, b = null) {
  const teias = [0.25, 0.5, 0.75, 1]
    .map((f) => poligono(EIXOS.map(() => f), "radar-teia"))
    .join("");

  const raios = EIXOS.map((_, i) => {
    const [x, y] = vertice(i, 1);
    return `<line x1="${RC}" y1="${RC}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" class="radar-raio"/>`;
  }).join("");

  const rotulos = EIXOS.map((nome, i) => {
    const [x, y] = vertice(i, 1.26);
    return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" class="radar-rot"
      text-anchor="${x < RC - 4 ? "end" : x > RC + 4 ? "start" : "middle"}"
      dominant-baseline="middle">${nome}</text>`;
  }).join("");

  return `
    <!-- o viewBox sobra bem à esquerda e à direita: "Velocidade" e
         "Hiperdrive" saem do círculo e seriam cortados num box justo -->
    <svg viewBox="-36 -6 172 112" class="radar" role="img"
         aria-label="Comparação de velocidade, hiperdrive, carga, tripulação e custo">
      ${teias}${raios}
      ${b ? poligono(b, "radar-poli radar-poli--b") : ""}
      ${poligono(a, "radar-poli radar-poli--a")}
      ${rotulos}
    </svg>`;
}

/* ---------------- Régua logarítmica de tamanho ----------------
   De 1 m a 200.000 m. Linear seria inútil: o Millennium Falcon (34 m) e a
   Death Star (120 km) não cabem na mesma barra reta. */
const RUL_MIN = 1;
const RUL_MAX = 200000;
const RUL_REF = [12, 35, 1600, 120000];

export function posicaoNaRegua(metros) {
  if (metros === null || metros <= 0) return null;
  const v = Math.max(RUL_MIN, Math.min(RUL_MAX, metros));
  return (Math.log10(v) - Math.log10(RUL_MIN)) / (Math.log10(RUL_MAX) - Math.log10(RUL_MIN));
}

export function regua() {
  const marcas = RUL_REF.map((m) => {
    const pct = (posicaoNaRegua(m) * 100).toFixed(2);
    return `<span class="rg-ref" style="left:${pct}%"><i></i><b>${m.toLocaleString("pt-BR")}</b></span>`;
  }).join("");

  return `
    <div class="rg">
      <div class="rg-barra" aria-hidden="true">
        <span class="rg-linha"></span>
        ${marcas}
        <span class="rg-item"></span>
      </div>
      <p class="rg-legenda">escala logarítmica, em metros</p>
    </div>`;
}

/* ---------------- Tabela de "quem vence" ----------------
   Fecha a comparação com o placar explícito: uma linha por métrica, a seta
   apontando para o lado que ganha. Métrica em que um dos dois não tem valor
   não entra — não dá para declarar vencedor contra um desconhecido. */
export function tabelaVitorias(linhas, nomeA, nomeB) {
  if (!linhas.length) return "";
  const corpo = linhas
    .map(({ rotulo, textoA, textoB, vence }) => {
      const seta =
        vence === "a" ? "◀" : vence === "b" ? "▶" : "—";
      return `
      <tr class="cmp-l cmp-l--${vence}">
        <td class="cmp-a">${textoA}</td>
        <td class="cmp-seta" aria-hidden="true">${seta}</td>
        <td class="cmp-rot">${rotulo}</td>
        <td class="cmp-b">${textoB}</td>
      </tr>`;
    })
    .join("");

  const placar = linhas.reduce(
    (acc, l) => {
      if (l.vence === "a") acc.a += 1;
      if (l.vence === "b") acc.b += 1;
      return acc;
    },
    { a: 0, b: 0 }
  );

  return `
    <table class="cmp-tabela">
      <caption class="cmp-cap">Quem vence em cada métrica</caption>
      <thead>
        <tr><th scope="col">${nomeA}</th><th scope="col"></th><th scope="col">Métrica</th><th scope="col">${nomeB}</th></tr>
      </thead>
      <tbody>${corpo}</tbody>
      <tfoot>
        <tr class="cmp-placar">
          <td>${placar.a}</td><td aria-hidden="true"></td><td>vitórias</td><td>${placar.b}</td>
        </tr>
      </tfoot>
    </table>`;
}
