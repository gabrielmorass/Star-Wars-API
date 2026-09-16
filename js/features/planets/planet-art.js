/* Planeta procedural em canvas, gerado a partir de `terrain` e `climate`
   da SWAPI.

   Quem manda na textura é o TERRENO; o clima só ajusta o tom e a cor da
   atmosfera. A decisão é por substring em terrain.toLowerCase(), e o
   primeiro da lista que bater ganha (ver TERRAIN_RULES).

   O desenho é feito em duas etapas:

   1. TEXTURA — uma faixa equiretangular (mapa-múndi) pintada pixel a pixel
      com value noise em quatro oitavas, mais uma passada de desenho 2D para
      o que é geométrico (malha urbana, crateras). Ecumenópoles ganham uma
      SEGUNDA faixa só com as luzes acesas. A faixa é gerada duas vezes lado
      a lado para que a amostragem nunca precise tratar a emenda.
   2. ESFERA — a cada quadro a faixa é reprojetada em ~64 fatias verticais.
      A longitude de cada fatia sai de asin(x), o que comprime a textura na
      borda do disco e dá a leitura de esfera. Somando um terminador
      (sombra do lado oposto à luz) e um halo de atmosfera, o disco vira
      planeta. A rotação é só o deslocamento da longitude ao longo do tempo.

   Este módulo é puro desenho: não conhece o painel, o mapa nem a
   navegação da view. Se o canvas não existir, nada acontece. */

import { subscribe, unsubscribe } from "../../fx/loop.js";

const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- 1. O terreno decide ---------------- */
/* A ordem é a regra: o primeiro que bater ganha. */
const TERRAIN_RULES = [
  { id: "city", match: /cityscape|urban|cities/ },
  { id: "volcanic", match: /lava|volcano/ },
  { id: "gas", match: /gas giant/ },
  /* oceano só quando não há terra firme junto */
  {
    id: "ocean",
    match: /ocean|\bseas\b/,
    unless: /grass|forest|mountain|hill|desert|city|urban|jungle|swamp|plain|savan|rock|island/,
  },
  { id: "arid", match: /desert|dune|arid/ },
  { id: "frozen", match: /\bice\b|tundra|glacier|frozen|snow/ },
  { id: "swamp", match: /swamp|jungle|rainforest|bog|murky/ },
  { id: "temperate", match: /grass|forest|hill|mountain|plain|savan|field|valley|verdant|river|lake/ },
  { id: "rock", match: /rock|barren|asteroid|canyon|mesa|plateau|cliff|cave|ash/ },
];

/* Só quando o terreno não disse nada ("unknown", vazio) o clima decide */
const CLIMATE_FALLBACK = [
  { id: "frozen", match: /frozen|frigid/ },
  { id: "arid", match: /arid/ },
  { id: "swamp", match: /murky|humid/ },
  { id: "volcanic", match: /\bhot\b|burning/ },
  { id: "temperate", match: /temperate|tropical|moist/ },
];

export function classify(climate = "", terrain = "") {
  const t = String(terrain).toLowerCase();
  for (const r of TERRAIN_RULES) {
    if (r.match.test(t) && !(r.unless && r.unless.test(t))) return r.id;
  }
  const c = String(climate).toLowerCase();
  for (const r of CLIMATE_FALLBACK) if (r.match.test(c)) return r.id;
  return "unknown";
}

/* ---------------- Paletas por terreno ---------------- */
/* sea  = base, land = relevo/contraste, deep = fundo profundo e polos,
   glow = cor da atmosfera. */
const KINDS = {
  city: {
    sea: "#2a2d33", land: "#444a54", deep: "#16181c", glow: "#cfe0ff",
    style: "city", lockGlow: true,
  },
  volcanic: {
    sea: "#171111", land: "#ff4a16", deep: "#060305", glow: "#ff6a2a",
    style: "veins",
  },
  gas: {
    sea: "#b8793a", land: "#f3d8ad", deep: "#6d3f18", glow: "#f2b06a",
    style: "bands", ring: true,
  },
  ocean: {
    sea: "#0b3568", land: "#2a7cc0", deep: "#04162e", glow: "#3d92e0",
    style: "ocean",
  },
  arid: {
    sea: "#cf9349", land: "#f4dda9", deep: "#93551f", glow: "#f0bd76",
    style: "dunes",
  },
  frozen: {
    sea: "#bcd9ef", land: "#ffffff", deep: "#7ea7c9", glow: "#c7e6ff",
    style: "land", caps: 0.18,
  },
  swamp: {
    sea: "#2f3a26", land: "#5d6b3f", deep: "#141c11", glow: "#7f9a6a",
    style: "land", fog: true,
  },
  temperate: {
    sea: "#17497f", land: "#46914d", deep: "#0a2245", glow: "#63b0ff",
    style: "land", caps: 0.08,
  },
  rock: {
    sea: "#6c6c70", land: "#8f8f93", deep: "#3c3c40", glow: "#9aa0a8",
    style: "craters",
  },
  unknown: {
    sea: "#474c55", land: "#7c828d", deep: "#25282e", glow: "#8a93a6",
    style: "land",
  },
};

/* ---------------- 2. O clima só ajusta tom e atmosfera ---------------- */
const CLIMATE_TINTS = [
  { match: /frozen|frigid/, mul: [0.93, 0.99, 1.10], glow: "#cfe8ff" },
  { match: /\bhot\b|burning/, mul: [1.14, 0.93, 0.84], glow: "#ff8a5a" },
  { match: /arid/, mul: [1.08, 1.00, 0.88], glow: "#f0bd76" },
  { match: /murky/, mul: [0.92, 1.01, 0.88], glow: "#7f9a6a" },
  { match: /humid|moist/, mul: [0.95, 1.03, 1.00], glow: "#8fd0c0" },
  { match: /tropical/, mul: [0.97, 1.06, 0.95], glow: "#5fd2a0" },
  { match: /windy/, mul: [1.02, 1.02, 1.02], glow: "#d8e4f0" },
  { match: /temperate/, mul: [1, 1, 1], glow: null },
];

function climateTint(climate = "") {
  const c = String(climate).toLowerCase();
  for (const t of CLIMATE_TINTS) if (t.match.test(c)) return t;
  return { mul: [0.97, 0.97, 0.99], glow: "#8a93a6" };
}

/* ---------------- Ruído ---------------- */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Lattice de value noise que dá a volta no eixo X: é o que mantém a
   textura contínua quando o planeta completa uma rotação. */
function lattice(rnd, gw, gh) {
  const g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  return (x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const xa = ((x0 % gw) + gw) % gw;
    const xb = (xa + 1) % gw;
    const ya = Math.min(Math.max(y0, 0), gh - 1);
    const yb = Math.min(ya + 1, gh - 1);
    const v0 = g[ya * gw + xa] * (1 - sx) + g[ya * gw + xb] * sx;
    const v1 = g[yb * gw + xa] * (1 - sx) + g[yb * gw + xb] * sx;
    return v0 * (1 - sy) + v1 * sy;
  };
}

const OCTAVES = [
  { gw: 6, gh: 3, amp: 0.52 },
  { gw: 12, gh: 6, amp: 0.26 },
  { gw: 24, gh: 12, amp: 0.14 },
  { gw: 48, gh: 24, amp: 0.08 },
];

function hexToRgb(hex) {
  const h = hex.replace("#", "").slice(0, 6);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function seedFrom(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ---------------- Camadas geométricas ---------------- */
const TW = 384;
const TH = 192;

/* Ecumenópole: a MESMA malha é desenhada duas vezes com a mesma semente —
   em cinza na face diurna e em âmbar aceso na camada noturna. */
function cityGeometry(ctx, seed, emissive) {
  const rnd = mulberry32(seed);

  /* grade irregular: guarda as posições para adensar as luzes em volta */
  const vx = [];
  for (let x = rnd() * 18; x < TW; x += 13 + rnd() * 26) vx.push(x);
  const hy = [];
  for (let y = 8 + rnd() * 12; y < TH - 6; y += 11 + rnd() * 22) hy.push(y);

  ctx.save();
  if (emissive) {
    ctx.shadowColor = "#ff8a3d";
    ctx.shadowBlur = 2.2;
  }

  ctx.strokeStyle = emissive ? "rgba(255,138,61,0.82)" : "rgba(150,162,180,0.10)";
  ctx.lineWidth = emissive ? 0.9 : 0.8;

  /* linhas levemente quebradas, para a grade não ficar mecânica */
  for (const x of vx) {
    ctx.beginPath();
    for (let y = 0; y <= TH; y += 24) {
      const jx = x + (rnd() - 0.5) * 3;
      if (y === 0) ctx.moveTo(jx, y);
      else ctx.lineTo(jx, y);
    }
    ctx.stroke();
  }
  for (const y of hy) {
    ctx.beginPath();
    for (let x = 0; x <= TW; x += 32) {
      const jy = y + (rnd() - 0.5) * 3;
      if (x === 0) ctx.moveTo(x, jy);
      else ctx.lineTo(x, jy);
    }
    ctx.stroke();
  }

  /* 3 distritos em anéis concêntricos */
  ctx.strokeStyle = emissive ? "rgba(255,179,71,0.78)" : "rgba(150,162,180,0.09)";
  const districts = [];
  for (let d = 0; d < 3; d++) {
    const dx = 30 + rnd() * (TW - 60);
    const dy = 40 + rnd() * (TH - 80);
    districts.push([dx, dy]);
    const rings = 3 + ((rnd() * 2) | 0);
    for (let i = 1; i <= rings; i++) {
      const rr = i * (5 + rnd() * 6);
      ctx.beginPath();
      ctx.ellipse(dx, dy, rr, rr * 0.82, 0, 0, Math.PI * 2);
      ctx.stroke();
      /* a emenda: repete o anel do outro lado quando encosta na borda */
      if (dx < rr + 2) { ctx.beginPath(); ctx.ellipse(dx + TW, dy, rr, rr * 0.82, 0, 0, Math.PI * 2); ctx.stroke(); }
      if (dx > TW - rr - 2) { ctx.beginPath(); ctx.ellipse(dx - TW, dy, rr, rr * 0.82, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
  }

  /* milhares de luzes, mais densas junto das linhas e dos distritos */
  ctx.shadowBlur = emissive ? 1.6 : 0;
  ctx.fillStyle = emissive ? "#ffb347" : "rgba(175,186,202,0.08)";
  const total = emissive ? 5200 : 2200;
  for (let i = 0; i < total; i++) {
    let px;
    let py;
    const pick = rnd();
    if (pick < 0.44) {
      px = vx[(rnd() * vx.length) | 0] + (rnd() - 0.5) * 6;
      py = rnd() * TH;
    } else if (pick < 0.7) {
      py = hy[(rnd() * hy.length) | 0] + (rnd() - 0.5) * 6;
      px = rnd() * TW;
    } else if (pick < 0.86) {
      const [dx, dy] = districts[(rnd() * districts.length) | 0];
      const a = rnd() * Math.PI * 2;
      const rr = rnd() * 26;
      px = dx + Math.cos(a) * rr;
      py = dy + Math.sin(a) * rr * 0.82;
    } else {
      px = rnd() * TW;
      py = rnd() * TH;
    }
    /* rarefaz nos polos, onde a projeção estica tudo */
    if (Math.abs(py / TH - 0.5) * 2 > 0.84 && rnd() < 0.72) continue;
    px = ((px % TW) + TW) % TW;
    ctx.globalAlpha = emissive ? 0.5 + rnd() * 0.5 : 0.5 + rnd() * 0.5;
    ctx.fillRect(px, py, emissive ? 1 : 0.8, emissive ? 1 : 0.8);
  }

  ctx.restore();
}

/* Crateras: aro claro, piso escuro e uma sombra em meia-lua */
function craterField(ctx, seed) {
  const rnd = mulberry32(seed);
  const one = (x, y, rr) => {
    const g = ctx.createRadialGradient(x, y, rr * 0.1, x, y, rr);
    g.addColorStop(0, "rgba(0,0,0,0.28)");
    g.addColorStop(0.72, "rgba(0,0,0,0.12)");
    g.addColorStop(0.86, "rgba(255,255,255,0.22)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
  };

  for (let i = 0; i < 90; i++) {
    const x = rnd() * TW;
    const y = 6 + rnd() * (TH - 12);
    const rr = 1.6 + rnd() * rnd() * 11;
    one(x, y, rr);
    if (x < rr) one(x + TW, y, rr);
    if (x > TW - rr) one(x - TW, y, rr);
  }
}

/* ---------------- Textura ---------------- */
const texCache = new Map();
const TEX_CACHE_MAX = 12; /* 12 planetas × ~0,6MB: cabe folgado */

function doubleWide(src) {
  const out = document.createElement("canvas");
  out.width = TW * 2;
  out.height = TH;
  const c = out.getContext("2d");
  c.drawImage(src, 0, 0);
  c.drawImage(src, TW, 0);
  return out;
}

function buildTexture(kindId, tint, seed) {
  const key = `${kindId}:${seed}`;
  const hit = texCache.get(key);
  if (hit) return hit;

  const k = KINDS[kindId] || KINDS.unknown;
  const rnd = mulberry32(seed);
  const noises = OCTAVES.map((o) => lattice(rnd, o.gw, o.gh));
  const warp = lattice(rnd, 5, 3);
  const swirl = lattice(rnd, 3, 2);

  const sea = hexToRgb(k.sea);
  const land = hexToRgb(k.land);
  const deep = hexToRgb(k.deep);

  const img = new ImageData(TW, TH);
  const px = img.data;
  const threshold = k.threshold ?? 0.5;
  const caps = k.caps ?? 0;
  const [mr, mg, mb] = tint.mul;

  for (let y = 0; y < TH; y++) {
    const v = y / TH;
    const pole = Math.abs(v - 0.5) * 2;

    for (let x = 0; x < TW; x++) {
      const u = x / TW;
      let n = 0;
      for (let i = 0; i < OCTAVES.length; i++) {
        const o = OCTAVES[i];
        n += noises[i](u * o.gw, v * o.gh) * o.amp;
      }

      let r;
      let g;
      let b;

      if (k.style === "bands" || k.style === "dunes") {
        /* faixas horizontais onduladas pelo ruído. No gigante gasoso as
           faixas dominam; nas dunas elas só insinuam o desenho da areia. */
        const gas = k.style === "bands";
        const count = gas ? 11 : 6;
        /* o gigante gasoso quer faixas horizontais legíveis: pouca ondulação
           e quase nenhum ruído. Nas dunas é o contrário. */
        const wobble = (warp(u * 5, v * 3) - 0.5) * (gas ? 0.16 : 0.9);
        const band = Math.sin((v + wobble) * Math.PI * count * 2) * 0.5 + 0.5;
        const m = Math.min(1, Math.max(0, gas ? band * 0.86 + n * 0.14 : band * 0.3 + n * 0.7));
        r = sea[0] + (land[0] - sea[0]) * m;
        g = sea[1] + (land[1] - sea[1]) * m;
        b = sea[2] + (land[2] - sea[2]) * m;
        if (gas) {
          /* marrom nas faixas mais escuras, para não virar só laranja */
          const dk = Math.max(0, 0.42 - m) * 1.6;
          r += (deep[0] - r) * dk;
          g += (deep[1] - g) * dk;
          b += (deep[2] - b) * dk;
        }
      } else if (k.style === "veins") {
        /* crosta escura rachada por veios de lava */
        const heat = Math.min(1, Math.max(0, (n - 0.56) / 0.16));
        const e = heat * heat;
        r = deep[0] + (land[0] - deep[0]) * e;
        g = deep[1] + (land[1] - deep[1]) * e;
        b = deep[2] + (land[2] - deep[2]) * e;
        /* laranja no miolo mais quente do veio */
        const core = Math.max(0, (n - 0.66) / 0.1);
        r += (255 - r) * Math.min(1, core) * 0.55;
        g += (170 - g) * Math.min(1, core) * 0.55;
        const crust = 0.82 + n * 0.36;
        r *= crust;
        g *= crust;
        b *= crust;
      } else if (k.style === "ocean") {
        /* azul profundo e espirais de nuvem: o ruído é amostrado com o
           ângulo torcido em função da latitude, o que enrola as nuvens */
        const tw = (swirl(u * 3, v * 2) - 0.5) * 0.55;
        const cu = u + tw * (0.5 - Math.abs(v - 0.5));
        let cl = 0;
        for (let i = 1; i < OCTAVES.length; i++) {
          const o = OCTAVES[i];
          cl += noises[i](cu * o.gw, v * o.gh) * o.amp;
        }
        cl = cl / 0.48;
        const depth = Math.min(1, Math.max(0, (0.52 - n) / 0.2));
        r = sea[0] + (deep[0] - sea[0]) * depth;
        g = sea[1] + (deep[1] - sea[1]) * depth;
        b = sea[2] + (deep[2] - sea[2]) * depth;
        const cloud = Math.min(1, Math.max(0, (cl - 0.52) / 0.16)) * 0.85;
        r += (242 - r) * cloud;
        g += (248 - g) * cloud;
        b += (255 - b) * cloud;
      } else if (k.style === "city" || k.style === "craters") {
        /* base lisa; a geometria entra na passada de desenho 2D */
        const m = k.style === "city" ? 0.12 + n * 0.5 : 0.35 + n * 0.6;
        r = sea[0] + (land[0] - sea[0]) * m;
        g = sea[1] + (land[1] - sea[1]) * m;
        b = sea[2] + (land[2] - sea[2]) * m;
        if (k.style === "city") {
          /* leve metalizado: realce fino seguindo o ruído fino */
          const spec = Math.max(0, noises[3](u * 48, v * 24) - 0.62) * 1.4;
          r += (210 - r) * spec * 0.22;
          g += (218 - g) * spec * 0.22;
          b += (232 - b) * spec * 0.22;
        }
      } else {
        /* continentes: o ruído acima do limiar vira terra */
        const m = Math.min(1, Math.max(0, (n - threshold) / 0.09));
        r = sea[0] + (land[0] - sea[0]) * m;
        g = sea[1] + (land[1] - sea[1]) * m;
        b = sea[2] + (land[2] - sea[2]) * m;
        if (n < threshold - 0.12) {
          const d = Math.min(1, (threshold - 0.12 - n) / 0.14);
          r += (deep[0] - r) * d * 0.8;
          g += (deep[1] - g) * d * 0.8;
          b += (deep[2] - b) * d * 0.8;
        }
        if (k.fog) {
          /* névoa baixa: clareia em manchas largas */
          const f = Math.max(0, warp(u * 5, v * 3) - 0.48) * 1.5;
          r += (176 - r) * f * 0.3;
          g += (188 - g) * f * 0.3;
          b += (168 - b) * f * 0.3;
        }
      }

      /* calotas polares */
      if (caps) {
        const c = Math.min(1, Math.max(0, (pole - (1 - caps * 2.6)) / (caps * 2)));
        const w = c * c * (0.6 + n * 0.5);
        r += (245 - r) * w;
        g += (250 - g) * w;
        b += (255 - b) * w;
      }

      /* o clima entra só aqui: ajuste de tom sobre a cor já decidida */
      const i4 = (y * TW + x) * 4;
      px[i4] = Math.min(255, r * mr);
      px[i4 + 1] = Math.min(255, g * mg);
      px[i4 + 2] = Math.min(255, b * mb);
      px[i4 + 3] = 255;
    }
  }

  const base = document.createElement("canvas");
  base.width = TW;
  base.height = TH;
  const bctx = base.getContext("2d");
  bctx.putImageData(img, 0, 0);

  let night = null;
  if (k.style === "city") {
    cityGeometry(bctx, seed, false);
    const nc = document.createElement("canvas");
    nc.width = TW;
    nc.height = TH;
    cityGeometry(nc.getContext("2d"), seed, true);
    night = doubleWide(nc);
  } else if (k.style === "craters") {
    craterField(bctx, seed);
  }

  const tex = { day: doubleWide(base), night };

  if (texCache.size >= TEX_CACHE_MAX) texCache.delete(texCache.keys().next().value);
  texCache.set(key, tex);
  return tex;
}

/* ---------------- Ticker dos planetas ----------------
   Não abre rAF próprio: entra com UM callback no laço global de
   js/fx/loop.js enquanto houver ao menos um canvas visível. */
const ticker = (() => {
  const views = new Set();
  let inscrito = false;

  const step = (dt) => {
    /* Canvas que saiu do documento (troca de view) para de custar quadro
       sozinho — é o que garante que sair do Sistema Planetário zere o laço
       sem depender de um teardown explícito. */
    let saiu = false;
    views.forEach((v) => {
      if (!v.el.isConnected) {
        views.delete(v);
        saiu = true;
      }
    });
    if (saiu) sync();

    /* cada estado de rotação avança UMA vez por quadro, mesmo quando dois
       canvases (painel e mini) compartilham o mesmo objeto */
    const done = new Set();
    views.forEach((v) => {
      if (done.has(v.spin)) return;
      done.add(v.spin);
      stepSpin(v.spin, dt);
    });
    views.forEach((v) => v.render());
  };

  const sync = () => {
    if (views.size && !inscrito) {
      subscribe(step);
      inscrito = true;
    } else if (!views.size && inscrito) {
      unsubscribe(step);
      inscrito = false;
    }
  };

  return {
    add(v) { views.add(v); sync(); },
    remove(v) { views.delete(v); sync(); },
  };
})();

/* ---------------- Estado de rotação ----------------
   Um objeto destes pode ser compartilhado por vários canvases: é assim que
   o mini-planeta do mapa gira na mesma fase do planeta do painel. */
export function createSpin(autoSpeed = 0.15) {
  return {
    rotation: 0,      /* deslocamento da textura, em px de faixa */
    velocity: autoSpeed,
    autoSpeed,
    dragging: false,
    tilt: 0,          /* inclinação atual da "câmera", em graus */
    tiltTarget: 0,
  };
}

const MAX_VELOCITY = 8;

/* Aproximação por quadro a 60fps, normalizada pelo dt real para o
   comportamento não mudar em telas de 120Hz. */
function approach(current, target, perFrame, frames) {
  return current + (target - current) * (1 - Math.pow(1 - perFrame, frames));
}

function stepSpin(s, dt) {
  const frames = Math.min(dt * 60, 3);

  /* solto, a velocidade volta suavemente para a de cruzeiro — é o que dá a
     inércia depois de arrastar. Com movimento reduzido, a de cruzeiro é 0. */
  if (!s.dragging) {
    s.velocity = approach(s.velocity, REDUCE ? 0 : s.autoSpeed, 0.02, frames);
  }

  s.rotation = (s.rotation + s.velocity * frames) % TW;
  if (s.rotation < 0) s.rotation += TW;

  s.tilt = approach(s.tilt, s.tiltTarget, 0.08, frames);
}

/* Arrastar para girar, com captura de ponteiro (mouse e toque). */
function attachDrag(canvas, spin) {
  let lastX = 0;
  let moved = 0;

  let captured = 0;

  canvas.addEventListener("pointerdown", (e) => {
    /* no mapa, o mini-planeta não pode arrastar o pan junto */
    e.stopPropagation();
    spin.dragging = true;
    lastX = e.clientX;
    moved = 0;
    canvas.classList.add("is-grabbing");
    /* enquanto arrasta, quem cuida de "clique fora" ignora tudo */
    document.body.classList.add("is-dragging");
    try {
      canvas.setPointerCapture(e.pointerId);
      captured = e.pointerId;
    } catch (_) { /* navegador sem suporte: segue sem captura */ }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (spin.dragging) {
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved += Math.abs(dx);
      spin.rotation = (spin.rotation + dx * 0.5) % TW;
      if (spin.rotation < 0) spin.rotation += TW;
      spin.velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, dx * 0.5));
      return;
    }
    /* sem arrastar: a "câmera" acompanha de leve o cursor na vertical */
    const r = canvas.getBoundingClientRect();
    spin.tiltTarget = ((e.clientY - r.top) / r.height - 0.5) * 6;
  });

  const end = (e) => {
    if (!spin.dragging) return;
    spin.dragging = false;
    canvas.classList.remove("is-grabbing");
    document.body.classList.remove("is-dragging");
    if (captured && e && canvas.hasPointerCapture && canvas.hasPointerCapture(captured)) {
      try {
        canvas.releasePointerCapture(captured);
      } catch (_) { /* já liberado */ }
    }
    captured = 0;
  };

  /* Com a captura ativa, o pointerup chega aqui mesmo que o cursor esteja
     longe do canvas — é o que impede o painel de fechar ao soltar fora. */
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("pointerleave", () => {
    /* sob captura este evento não dispara durante o arrasto; sem captura,
       serve de rede de segurança */
    if (!captured) end();
    spin.tiltTarget = 0;
  });

  /* um arrasto não é um clique: no mapa, isso reabriria o painel */
  canvas.addEventListener("click", (e) => {
    if (moved > 3) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);
}

/* ---------------- Renderer ---------------- */
export function createPlanetView(
  canvas,
  planet,
  { size = 160, slices = 64, spin = null, interactive = false } = {}
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { setPlanet() {}, setPaused() {}, destroy() {}, spin: spin || createSpin() };

  /* o estado de rotação pode vir de fora: é assim que painel e mini-planeta
     giram juntos, na mesma fase */
  const state = spin || createSpin();

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.scale(dpr, dpr);

  let kind = KINDS.unknown;
  let tex = null;
  let glow = KINDS.unknown.glow;
  let ring = false;
  let planetKey = null;

  /* canvas auxiliar para montar a face noturna das ecumenópoles */
  let scratch = null;
  let sctx = null;

  const cx = size / 2;
  const cy = size / 2;
  /* sobra de raio para o halo de atmosfera e para o anel */
  const r = size * 0.38;

  /* Reprojeção equiretangular → esfera, fatia a fatia. As bordas das fatias
     são arredondadas para pixel inteiro e cada uma é desenhada 1px mais
     larga que a vizinha: sem isso, o antialias das bordas subpixel deixa
     listras verticais claras entre as fatias. */
  function drawSlices(target, strip) {
    const rot = state.rotation / TW;
    /* a faixa é amostrada com uma margem em cima e embaixo, e a inclinação
       da "câmera" só desliza essa janela — ±3° de latitude */
    const margin = TH * 0.03;
    const sy = margin + (state.tilt / 180) * TH;
    const sh = TH - margin * 2;

    for (let i = 0; i < slices; i++) {
      const dxa = Math.round((i / slices) * 2 * r);
      const dxb = Math.round(((i + 1) / slices) * 2 * r);
      if (dxb <= dxa) continue;
      const xa = Math.max(-0.9995, Math.min(0.9995, dxa / r - 1));
      const xb = Math.max(-0.9995, Math.min(0.9995, dxb / r - 1));
      const la = Math.asin(xa) / Math.PI + 0.5 + rot;
      const lb = Math.asin(xb) / Math.PI + 0.5 + rot;
      const sx = (la - Math.floor(la)) * TW;
      const sw = (lb - la) * TW;
      if (sw <= 0) continue;
      target.drawImage(strip, sx, sy, sw, sh, cx - r + dxa, cy - r, dxb - dxa + 1, r * 2);
    }
  }

  /* ---------------- Camadas estáticas ----------------
     Sombra do terminador, realce do limbo, halo de atmosfera e anel não
     dependem da rotação. Antes eram três gradientes criados a cada quadro;
     agora são pintados UMA vez por planeta em canvases próprios, e o quadro
     só faz drawImage deles. */
  let layerBack = null;    /* halo + metade de trás do anel */
  let layerLight = null;   /* terminador + limbo, já recortados no disco */
  let layerFront = null;   /* metade da frente do anel + borda da atmosfera */
  let nightMask = null;    /* máscara das luzes urbanas (lado noturno) */

  function offscreen() {
    const c = document.createElement("canvas");
    c.width = size * dpr;
    c.height = size * dpr;
    const cc = c.getContext("2d");
    cc.scale(dpr, dpr);
    return { canvas: c, ctx: cc };
  }

  /* Gradiente do terminador: a luz vem de cima à esquerda. A mesma
     geometria serve de máscara para as luzes da cidade. */
  function terminator(target, stops) {
    const gr = target.createRadialGradient(
      cx - r * 0.45, cy - r * 0.4, r * 0.1,
      cx - r * 0.15, cy, r * 1.7
    );
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    return gr;
  }

  function ringHalf(target, half) {
    target.save();
    target.beginPath();
    target.rect(0, half === "back" ? 0 : cy, size, cy);
    target.clip();
    target.translate(cx, cy);
    target.rotate(-0.32);
    target.strokeStyle = `${kind.land}88`;
    target.lineWidth = Math.max(1.2, r * 0.17);
    target.beginPath();
    target.ellipse(0, 0, r * 1.62, r * 0.4, 0, 0, Math.PI * 2);
    target.stroke();
    target.strokeStyle = `${kind.deep}66`;
    target.lineWidth = Math.max(0.6, r * 0.05);
    target.beginPath();
    target.ellipse(0, 0, r * 1.44, r * 0.355, 0, 0, Math.PI * 2);
    target.stroke();
    target.restore();
  }

  function buildLayers() {
    /* trás: atmosfera + metade de trás do anel */
    const back = offscreen();
    const halo = back.ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.32);
    halo.addColorStop(0, `${glow}00`);
    halo.addColorStop(0.35, `${glow}55`);
    halo.addColorStop(1, `${glow}00`);
    back.ctx.fillStyle = halo;
    back.ctx.beginPath();
    back.ctx.arc(cx, cy, r * 1.32, 0, Math.PI * 2);
    back.ctx.fill();
    if (ring) ringHalf(back.ctx, "back");
    layerBack = back.canvas;

    /* luz: sombra e realce, recortados no disco */
    const light = offscreen();
    light.ctx.save();
    light.ctx.beginPath();
    light.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    light.ctx.clip();
    light.ctx.fillStyle = terminator(light.ctx, [
      [0, "rgba(0,0,0,0)"],
      [0.42, "rgba(0,0,0,0.12)"],
      [0.72, "rgba(0,0,0,0.6)"],
      [1, "rgba(0,0,0,0.92)"],
    ]);
    light.ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    const rim = light.ctx.createRadialGradient(
      cx - r * 0.34, cy - r * 0.34, r * 0.05,
      cx - r * 0.34, cy - r * 0.34, r * 0.95
    );
    rim.addColorStop(0, "rgba(255,255,255,0.22)");
    rim.addColorStop(1, "rgba(255,255,255,0)");
    light.ctx.fillStyle = rim;
    light.ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    light.ctx.restore();
    layerLight = light.canvas;

    /* frente: metade da frente do anel + borda fina de atmosfera */
    const front = offscreen();
    if (ring) ringHalf(front.ctx, "front");
    front.ctx.strokeStyle = `${glow}${kind.style === "city" ? "88" : "66"}`;
    front.ctx.lineWidth = Math.max(1, size * (kind.style === "city" ? 0.009 : 0.012));
    front.ctx.beginPath();
    front.ctx.arc(cx, cy, r + front.ctx.lineWidth * 0.4, 0, Math.PI * 2);
    front.ctx.stroke();
    layerFront = front.canvas;

    /* máscara das luzes urbanas: quase nada no dia, tudo na noite */
    if (tex && tex.night) {
      const mask = offscreen();
      mask.ctx.fillStyle = terminator(mask.ctx, [
        [0, "rgba(0,0,0,0.05)"],
        [0.45, "rgba(0,0,0,0.2)"],
        [0.75, "rgba(0,0,0,0.88)"],
        [1, "rgba(0,0,0,1)"],
      ]);
      mask.ctx.fillRect(0, 0, size, size);
      nightMask = mask.canvas;
    } else {
      nightMask = null;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, size, size);
    if (!tex || !layerBack) return;

    ctx.drawImage(layerBack, 0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    drawSlices(ctx, tex.day);
    ctx.restore();

    ctx.drawImage(layerLight, 0, 0, size, size);

    /* Luzes da cidade: montadas à parte e recortadas pela máscara estática,
       depois somadas por cima. */
    if (tex.night && nightMask) {
      if (!scratch) {
        const o = offscreen();
        scratch = o.canvas;
        sctx = o.ctx;
      }
      sctx.globalCompositeOperation = "source-over";
      sctx.clearRect(0, 0, size, size);
      sctx.save();
      sctx.beginPath();
      sctx.arc(cx, cy, r, 0, Math.PI * 2);
      sctx.clip();
      drawSlices(sctx, tex.night);
      sctx.restore();

      sctx.globalCompositeOperation = "destination-in";
      sctx.drawImage(nightMask, 0, 0, size, size);
      sctx.globalCompositeOperation = "source-over";

      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(scratch, 0, 0, size, size);
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.drawImage(layerFront, 0, 0, size, size);
  }

  /* O que o ticker precisa de cada canvas: o estado que o move e como
     redesenhar. O avanço do estado é feito pelo ticker, uma vez por quadro. */
  const view = { spin: state, render: draw, el: canvas };

  let running = false;

  function setPaused(paused) {
    if (paused === !running) return;
    running = !paused;
    if (running) ticker.add(view);
    else ticker.remove(view);
    if (!running) draw();  /* deixa o último quadro pintado */
  }

  function setPlanet(p) {
    const id = classify(p && p.climate, p && p.terrain);
    const tint = climateTint(p && p.climate);
    const key = `${id}:${(p && p.name) || ""}`;

    kind = KINDS[id] || KINDS.unknown;
    ring = Boolean(kind.ring);
    /* a atmosfera segue o clima, menos onde o terreno a define (cidade) */
    glow = kind.lockGlow || !tint.glow ? kind.glow : tint.glow;
    /* cacheada por tipo + nome: o mini reaproveita a faixa do painel */
    tex = buildTexture(id, tint, seedFrom(String((p && p.name) || "")));
    buildLayers();

    /* planeta novo recomeça do zero, mas mantém a velocidade atual para não
       dar solavanco quando se navega no meio de um arrasto */
    if (key !== planetKey) {
      planetKey = key;
      state.rotation = 0;
    }
    draw();
  }

  if (interactive) {
    canvas.style.touchAction = "none";
    attachDrag(canvas, state);
  }

  setPlanet(planet);
  setPaused(false);

  return {
    setPlanet,
    setPaused,
    spin: state,
    /* cor dominante — usada para o halo do ponto no mapa */
    get glow() {
      return glow;
    },
    destroy() {
      ticker.remove(view);
      running = false;
    },
  };
}
