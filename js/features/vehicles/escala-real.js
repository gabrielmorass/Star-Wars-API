/* Painel "Escala real" da comparação.
   ------------------------------------------------------------------
   Os medidores normalizam tudo contra o teto da categoria, o que é ótimo
   para ler cada métrica e péssimo para sentir tamanho: no arco, um X-wing
   e um Star Destroyer parecem coisas comparáveis. Aqui as duas silhuetas
   são desenhadas no MESMO fator de escala, calculado pelo comprimento real.
   O X-wing vira um risco ao lado do destróier — e é esse o ponto.

   Um SVG só, com as duas naves em linhas de base separadas e alinhadas pela
   esquerda: sobrepor não daria para ler, e lado a lado a maior não caberia. */
import { arteDe } from "./silhuetas.js";

const W = 1000;
const H = 340;
const ESQ = 34;
const DIR = 24;
const USAVEL = W - ESQ - DIR;

const BASE_A = 130;
const BASE_B = 258;
const REGUA_Y = 296;
/* Altura máxima que cada nave pode ocupar na sua faixa. É o segundo limite
   da escala: sem ele, uma nave "gorda" (a Falcon tem 64x50 de proporção)
   escalada só pela largura sai com centenas de unidades de altura e vaza
   para fora do painel. */
const BANDA = 108;

const ALTURA_HUMANO = 1.8;
const RAZAO_ZOOM = 500;

/* Humano de referência, desenhado numa caixa de 1 unidade de altura para
   poder ser escalado direto pelo fator de metros. */
const HUMANO = `
  <g class="er-humano">
    <circle cx="0.16" cy="0.09" r="0.085"/>
    <path d="M0.16 0.18 L0.16 0.6"/>
    <path d="M0.16 0.26 L0.03 0.42 M0.16 0.26 L0.29 0.42"/>
    <path d="M0.16 0.6 L0.05 1 M0.16 0.6 L0.27 1"/>
  </g>`;

/* Passo de régua "redondo" (1, 2 ou 5 vezes uma potência de 10), para as
   marcações caírem em números que uma pessoa lê sem esforço. */
function passoBonito(maximo, alvo = 6) {
  const bruto = maximo / alvo;
  const expoente = Math.floor(Math.log10(bruto));
  const base = 10 ** expoente;
  const n = bruto / base;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return m * base;
}

function metros(n) {
  /* uma casa só quando ela existe e o número é pequeno: 12,5 m importa,
     120.000,0 m é ruído */
  const casas = n < 1000 && !Number.isInteger(n) ? 1 : 0;
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  });
}

/* Desenha uma nave assentada numa linha de base, escalada pelo comprimento.
   O `vector-effect: non-scaling-stroke` (no CSS) é o que mantém o traço
   visível mesmo quando a escala é de 0,008 — sem ele a nave menor
   desapareceria de vez em vez de virar um risco. */
function nave(chave, metrosNave, fator, baseY, classe, atraso) {
  const { vb, d } = arteDe(chave);
  const [vw, vh] = vb;
  const escala = (metrosNave * fator) / vw;
  const y = baseY - vh * escala;
  return `
    <g class="er-cresce" style="--atraso:${atraso}ms">
      <g class="er-nave ${classe}" transform="translate(${ESQ} ${y.toFixed(2)}) scale(${escala.toFixed(5)})">
        ${d}
      </g>
    </g>`;
}

function regua(maior, largura) {
  const marca = (v, ancora) => {
    const x = ESQ + (v / maior) * largura;
    return `
      <line x1="${x.toFixed(2)}" y1="${REGUA_Y}" x2="${x.toFixed(2)}" y2="${REGUA_Y + 7}" class="er-tick"/>
      <text x="${x.toFixed(2)}" y="${REGUA_Y + 19}" class="er-num" text-anchor="${ancora}">${metros(v)}</text>`;
  };

  const linha = `<line x1="${ESQ}" y1="${REGUA_Y}" x2="${(ESQ + largura).toFixed(2)}"
                       y2="${REGUA_Y}" class="er-linha"/>`;

  /* Quando a nave maior é "gorda", a altura limita a escala e a régua fica
     curta. Aí não cabe marcação intermediária nenhuma: sete números em 100
     unidades viram um borrão. Abaixo desse piso, só as pontas. */
  if (largura < 240) {
    return `${linha}${marca(0, "start")}${marca(maior, "end")}`;
  }

  const passo = passoBonito(maior, Math.max(2, Math.min(7, Math.floor(largura / 130))));
  let marcas = "";
  for (let v = 0; v <= maior + passo * 0.01; v += passo) {
    if (ESQ + (v / maior) * largura > ESQ + largura + 1) break;
    marcas += marca(v, v === 0 ? "start" : "middle");
  }
  return `${linha}${marcas}`;
}

/* Lupa: quando a razão passa de 500:1 a menor já não tem pixel nenhum, então
   ela reaparece ampliada num círculo, com uma linha ligando ao ponto real. */
function lupa(chave, larguraReal, baseY, razao) {
  const cx = W - DIR - 62;
  const cy = 58;
  const r = 46;
  const { vb, d } = arteDe(chave);
  const [vw, vh] = vb;
  const alvo = r * 1.25;
  const escala = alvo / Math.max(vw, vh);
  const dx = cx - (vw * escala) / 2;
  const dy = cy - (vh * escala) / 2;
  const ampliacao = Math.round(alvo / Math.max(larguraReal, 0.001)).toLocaleString("pt-BR");

  return `
    <line x1="${ESQ + larguraReal / 2}" y1="${baseY - 4}" x2="${cx - r * 0.72}" y2="${cy + r * 0.72}"
          class="er-guia"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" class="er-lupa"/>
    <g class="er-nave er-nave--b" transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${escala.toFixed(4)})">
      ${d}
    </g>
    <text x="${cx}" y="${cy + r + 15}" class="er-num" text-anchor="middle">ampliado ${ampliacao}×</text>`;
}

/**
 * @param {{nome:string, chave:string, metros:number|null}} a
 * @param {{nome:string, chave:string, metros:number|null}} b
 */
export function escalaReal(a, b) {
  if (a.metros === null || b.metros === null) {
    const sem = a.metros === null ? a.nome : b.nome;
    return `
      <div class="nv-secao er-bloco">
        <h4>Escala real</h4>
        <p class="nv-vazio">A SWAPI não traz o comprimento de ${sem}, então não dá
        para desenhar as duas na mesma escala.</p>
      </div>`;
  }

  const maior = Math.max(a.metros, b.metros);
  const menor = Math.min(a.metros, b.metros);
  const razao = menor > 0 ? maior / menor : Infinity;

  const arteA = arteDe(a.chave);
  const arteB = arteDe(b.chave);

  /* Um fator único de unidades-por-metro, o mesmo para as duas naves — é o
     que faz a comparação ser honesta. Ele respeita dois limites: a largura
     útil do painel e a altura da faixa de cada nave. Vence o menor. */
  const porLargura = USAVEL / maior;
  const alturaRel = (arte, m) => (m * arte.vb[1]) / arte.vb[0];
  const porAltura = BANDA / Math.max(alturaRel(arteA, a.metros), alturaRel(arteB, b.metros));
  const fator = Math.min(porLargura, porAltura);

  const largA = a.metros * fator;
  const largB = b.metros * fator;
  const larguraRegua = maior * fator;

  /* O humano só entra quando sobra o que ver: abaixo disso ele é um ponto
     que confunde mais do que ajuda. Fica no canto superior DIREITO porque a
     coluna da esquerda é toda dos rótulos das naves — ali ele colidia. */
  const escalaHumano = ALTURA_HUMANO * fator;
  const humanoX = W - DIR - 46;
  const humano =
    escalaHumano >= 6
      ? `<g class="er-cresce" style="--atraso:320ms">
           <g transform="translate(${humanoX} ${(96 - escalaHumano).toFixed(2)}) scale(${escalaHumano.toFixed(3)})">
             ${HUMANO}
           </g>
         </g>
         <text x="${humanoX}" y="112" class="er-num">1,8 m</text>`
      : "";

  const menorEhA = a.metros <= b.metros;
  const zoom =
    razao > RAZAO_ZOOM
      ? lupa(
          menorEhA ? a.chave : b.chave,
          menorEhA ? largA : largB,
          menorEhA ? BASE_A : BASE_B,
          razao
        )
      : "";

  return `
    <div class="nv-secao er-bloco">
      <h4>Escala real <span class="er-unid-tit">em metros</span></h4>
      <svg viewBox="0 0 ${W} ${H}" class="er-svg" role="img"
           aria-label="${a.nome} com ${metros(a.metros)} metros ao lado de ${b.nome} com ${metros(b.metros)} metros, na mesma escala">
        ${nave(a.chave, a.metros, fator, BASE_A, "er-nave--a", 0)}
        <text x="${ESQ}" y="${BASE_A + 16}" class="er-rot er-rot--a">${a.nome} · ${metros(a.metros)} m</text>

        ${nave(b.chave, b.metros, fator, BASE_B, "er-nave--b", 160)}
        <text x="${ESQ}" y="${BASE_B + 16}" class="er-rot er-rot--b">${b.nome} · ${metros(b.metros)} m</text>

        ${humano}
        ${zoom}
        ${regua(maior, larguraRegua)}
      </svg>
      <p class="er-nota">
        ${
          razao >= 2
            ? `${(menorEhA ? b.nome : a.nome)} é <b>${razao.toLocaleString("pt-BR", { maximumFractionDigits: razao < 10 ? 1 : 0 })}×</b> mais comprida.`
            : "As duas têm comprimento parecido."
        }
      </p>
    </div>`;
}
