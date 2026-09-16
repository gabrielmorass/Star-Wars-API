import { getPlanetSpecies, getPlanetFilms } from "./api.js";
import { createPlanetView, createSpin } from "./planet-art.js";
import { subscribe, unsubscribe } from "../../fx/loop.js";
import { takeIntent } from "../../core/nav-intent.js";

/* ---------------- Mapa da galáxia ----------------
   Fundo (galáxia espiral, grid e blobs de região) é SVG desenhado em
   código; os planetas são elementos HTML posicionados por cima, para
   manter tamanhos e rótulos em pixels exatos.

   Posições e regiões vêm de src/data/planets-map.json, combinadas com
   os dados da SWAPI pelo nome. O painel de detalhes continua sendo o
   #planet-card, alimentado pelos mesmos dados de antes. */

const MAP_URL = "src/data/planets-map.json";

/* Ordem do centro para fora — define o empilhamento dos blobs */
const REGIONS = [
  { id: "Deep Core", label: "Deep Core", color: "#e8e8ff" },
  { id: "Core", label: "Core", color: "#f2c94c" },
  { id: "Colonies", label: "Colonies", color: "#f2994a" },
  { id: "Inner Rim", label: "Inner Rim", color: "#eb5757" },
  { id: "Expansion Region", label: "Expansion Region", color: "#9b51e0" },
  { id: "Mid Rim", label: "Mid Rim", color: "#2f80ed" },
  { id: "Outer Rim", label: "Outer Rim", color: "#56ccf2" },
];

const REGION_COLOR = Object.fromEntries(REGIONS.map((r) => [r.id, r.color]));
REGION_COLOR["Unknown Regions"] = "#8a93a6";

/* PRNG com semente: o fundo é aleatório mas sempre igual entre recargas */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Curva fechada e suave a partir de pontos (Catmull-Rom → Bézier) */
function closedSmoothPath(pts) {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d + "Z";
}

/* Raios por setor: cada região envolve os próprios planetas e sempre
   fica por fora da anterior, o que dá blobs aninhados e irregulares. */
function buildRegionShapes(points, cx, cy) {
  const BINS = 48;
  const PAD = 4.5;
  const GAP = 2.6;
  const rnd = mulberry32(20240916);

  const byRegion = new Map();
  for (const p of points) {
    if (!byRegion.has(p.region)) byRegion.set(p.region, []);
    byRegion.get(p.region).push(p);
  }

  const smooth = (arr) => {
    const out = arr.slice();
    for (let i = 0; i < arr.length; i++) {
      const a = arr[(i - 1 + arr.length) % arr.length];
      const b = arr[i];
      const c = arr[(i + 1) % arr.length];
      out[i] = (a + 2 * b + c) / 4;
    }
    return out;
  };

  let prev = new Array(BINS).fill(0);
  const shapes = [];

  REGIONS.forEach((region, ri) => {
    const members = byRegion.get(region.id) || [];
    const dists = members.map((p) => Math.hypot(p.x - cx, p.y - cy));
    const median = dists.length
      ? dists.slice().sort((a, b) => a - b)[Math.floor(dists.length / 2)]
      : 3 + ri * 5;

    let r = new Array(BINS).fill(0);
    for (const p of members) {
      const ang = Math.atan2(p.y - cy, p.x - cx);
      const bin = ((Math.round((ang / (Math.PI * 2)) * BINS) % BINS) + BINS) % BINS;
      const d = Math.hypot(p.x - cx, p.y - cy) + PAD;
      /* o planeta empurra o próprio setor e um pouco os vizinhos */
      for (let k = -2; k <= 2; k++) {
        const b = (bin + k + BINS) % BINS;
        r[b] = Math.max(r[b], d - Math.abs(k) * 1.2);
      }
    }
    /* setores sem planeta seguem a mediana da região */
    for (let i = 0; i < BINS; i++) if (!r[i]) r[i] = median + PAD * 0.6;

    r = smooth(smooth(r));
    /* nunca invade a região de dentro */
    for (let i = 0; i < BINS; i++) r[i] = Math.max(r[i], prev[i] + GAP);
    r = smooth(r);
    for (let i = 0; i < BINS; i++) r[i] = Math.max(r[i], prev[i] + GAP * 0.8);
    /* borda orgânica */
    for (let i = 0; i < BINS; i++) r[i] += (rnd() - 0.5) * 1.6;
    r = smooth(r);

    const pts = r.map((rad, i) => {
      const a = (i / BINS) * Math.PI * 2;
      return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
    });

    shapes.push({ ...region, path: closedSmoothPath(pts), radii: r });
    prev = r;
  });

  return shapes;
}

/* Rasteriza os braços filtrados uma única vez, num PNG, para o filtro SVG
   sair do caminho do desenho. Falhando, o mapa fica com o <g> de reserva. */
function bakeArms(inner, px = 1400) {
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 100 100">${inner}</svg>`;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([doc], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = px;
        c.height = px;
        c.getContext("2d").drawImage(img, 0, 0, px, px);
        resolve(c.toDataURL("image/png"));
      } catch (_) {
        resolve(null);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function galaxyBackground(shapes, cx, cy) {
  const rnd = mulberry32(7);

  /* 200 estrelas: continuam <circle> (nítidas em qualquer zoom) */
  let stars = "";
  for (let i = 0; i < 200; i++) {
    const x = rnd() * 100;
    const y = rnd() * 100;
    const r = 0.06 + rnd() * rnd() * 0.32;
    stars += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="#fff" opacity="${(0.25 + rnd() * 0.65).toFixed(2)}"/>`;
  }

  /* dois braços espirais logarítmicos */
  const arm = (offset) => {
    let d = "";
    for (let t = 0; t <= 44; t++) {
      const th = (t / 44) * 3.4 * Math.PI + offset;
      const rad = 2.2 * Math.exp(0.25 * th - 0.25 * offset);
      const x = cx + rad * Math.cos(th);
      const y = cy + rad * Math.sin(th) * 0.94;
      d += (t === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2);
    }
    return d;
  };

  /* grid 20×20 com letras no topo e números na lateral */
  let grid = "";
  for (let i = 0; i <= 20; i++) {
    const v = i * 5;
    grid += `<line x1="${v}" y1="0" x2="${v}" y2="100"/><line x1="0" y1="${v}" x2="100" y2="${v}"/>`;
  }
  let marks = "";
  for (let i = 0; i < 20; i++) {
    const letter = String.fromCharCode(65 + i);
    marks += `<text class="gx-mark" x="${i * 5 + 2.5}" y="3.1" text-anchor="middle">${letter}</text>`;
    marks += `<text class="gx-mark" x="1.6" y="${i * 5 + 3.4}" text-anchor="middle">${i + 1}</text>`;
  }

  /* mesmo conteúdo do <g> filtrado, usado para assar a imagem */
  const armsInner = `
    <defs>
      <linearGradient id="gxArm" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7fd4ff" stop-opacity="0.5"/>
        <stop offset="0.5" stop-color="#3f7fd8" stop-opacity="0.3"/>
        <stop offset="1" stop-color="#1b2f6b" stop-opacity="0.05"/>
      </linearGradient>
      <filter id="gxNoise" x="-25%" y="-25%" width="150%" height="150%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="11" result="t"/>
        <feDisplacementMap in="SourceGraphic" in2="t" scale="7" xChannelSelector="R" yChannelSelector="G"/>
        <feGaussianBlur stdDeviation="0.7"/>
      </filter>
    </defs>
    <g filter="url(#gxNoise)">
      <path d="${arm(0)}" fill="none" stroke="url(#gxArm)" stroke-width="13" stroke-linecap="round"/>
      <path d="${arm(Math.PI)}" fill="none" stroke="url(#gxArm)" stroke-width="13" stroke-linecap="round"/>
    </g>`;

  const blobs = shapes
    .map(
      (s) => `<path class="gx-region" data-region="${s.id}" d="${s.path}"
        fill="${s.color}" fill-opacity="0.25" stroke="${s.color}" stroke-opacity="0.6"
        stroke-width="1" vector-effect="non-scaling-stroke"/>`
    )
    .reverse()
    .join("");

  galaxyBackground.lastArms = armsInner;

  return `
<svg class="galaxy-bg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <defs>
    <radialGradient id="gxCore" cx="${cx}%" cy="${cy}%" r="34%">
      <stop offset="0" stop-color="#cfe6ff" stop-opacity="0.55"/>
      <stop offset="0.45" stop-color="#4a7fd0" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#0a1230" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gxArm" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7fd4ff" stop-opacity="0.5"/>
      <stop offset="0.5" stop-color="#3f7fd8" stop-opacity="0.3"/>
      <stop offset="1" stop-color="#1b2f6b" stop-opacity="0.05"/>
    </linearGradient>
    <filter id="gxNoise" x="-25%" y="-25%" width="150%" height="150%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="11" result="t"/>
      <feDisplacementMap in="SourceGraphic" in2="t" scale="7" xChannelSelector="R" yChannelSelector="G"/>
      <feGaussianBlur stdDeviation="0.7"/>
    </filter>
  </defs>

  <rect width="100" height="100" fill="#05060d"/>

  <g class="gx-zoom">
  <!-- Os braços espirais usavam feTurbulence + feDisplacementMap + blur, que
       o navegador reexecutava a cada quadro de pan/zoom. Agora o filtro é
       aplicado UMA vez fora da tela (bakeArms) e o resultado entra como
       imagem; o <g> abaixo é só o desenho de reserva, caso a assadura falhe. -->
  <g class="gx-arms-fallback" opacity="0.6">
    <path d="${arm(0)}" fill="none" stroke="url(#gxArm)" stroke-width="13" stroke-linecap="round"/>
    <path d="${arm(Math.PI)}" fill="none" stroke="url(#gxArm)" stroke-width="13" stroke-linecap="round"/>
  </g>
  <image class="gx-arms" x="0" y="0" width="100" height="100" opacity="0.85" style="display:none"/>

  <circle cx="${cx}" cy="${cy}" r="34" fill="url(#gxCore)"/>

  <g class="gx-stars">${stars}</g>

  <g class="gx-grid" stroke="rgba(255,255,255,0.05)" stroke-width="1" vector-effect="non-scaling-stroke">${grid}</g>
  <g>${marks}</g>

  <g class="gx-regions">${blobs}</g>
  </g>
</svg>`;
}

export function renderPlanetsView(container, planets) {
  let index = 0;
  let requestId = 0;
  const detailCache = new Map();

  container.innerHTML = `
    <div class="galaxy-frame">
      <div class="galaxy-head">
        <div class="people-toolbar map-search">
          <input type="search" id="planet-search" placeholder="Buscar planeta"
                 aria-label="Buscar planeta" autocomplete="off" spellcheck="false"
                 role="combobox" aria-expanded="false" aria-autocomplete="list"
                 aria-controls="planet-suggest" />
          <ul class="map-suggest" id="planet-suggest" role="listbox"
              aria-label="Planetas encontrados" hidden></ul>
        </div>
        <button class="galaxy-recenter" type="button">Recentrar</button>
      </div>

      <div class="galaxy-stage">
        <div class="galaxy-viewport"></div>
      </div>
    </div>

    <div class="orbit-controls">
      <button class="carousel-arrow" id="prev-planet" type="button" aria-label="Planeta anterior">‹</button>
      <p class="carousel-position" id="planet-position"></p>
      <button class="carousel-arrow" id="next-planet" type="button" aria-label="Próximo planeta">›</button>
    </div>

    <aside class="planet-panel detail-panel" id="planet-card" tabindex="-1" aria-label="Detalhes do planeta"></aside>
  `;

  const stage = container.querySelector(".galaxy-stage");
  const viewport = container.querySelector(".galaxy-viewport");
  const recenterBtn = container.querySelector(".galaxy-recenter");
  const card = container.querySelector("#planet-card");
  const position = container.querySelector("#planet-position");
  const prevBtn = container.querySelector("#prev-planet");
  const nextBtn = container.querySelector("#next-planet");
  const searchInput = container.querySelector("#planet-search");
  const suggestList = container.querySelector("#planet-suggest");

  /* ---------- Painel ---------- */
  /* O planeta grande só gira com o painel aberto: fechado, nada do que ele
     desenha está à vista, então não há motivo para gastar quadro. */
  const openPanel = () => {
    card.classList.add("is-open");
    if (bigPlanet) bigPlanet.setPaused(false);
  };

  const closePanel = () => {
    card.classList.remove("is-open");
    if (bigPlanet) bigPlanet.setPaused(true);
  };

  const pills = (list, empty) =>
    list && list.length
      ? list.map((t) => `<span class="pill">${t}</span>`).join("")
      : `<span class="value">${empty}</span>`;

  /* O planeta do painel é um canvas procedural (js/features/planets/planet-art.js)
     desenhado a partir do climate/terrain que vem da SWAPI. O mesmo objeto de
     rotação alimenta o mini-planeta do mapa: arrastar um gira o outro, na
     mesma fase, e os dois reaproveitam a mesma textura pré-renderizada. */
  const spin = createSpin();
  let bigPlanet = null;

  /* Estrutura do painel — refeita só quando muda de planeta, para o canvas
     não ser destruído e recriado quando as espécies/filmes chegam. */
  function buildShell(planet, coord) {
    const color = REGION_COLOR[coord ? coord.region : ""] || "#8a93a6";

    card.innerHTML = `
      <button class="planet-panel-close" type="button" aria-label="Fechar detalhes">×</button>
      <div class="planet-visual" aria-hidden="true">
        <canvas class="planet-canvas"></canvas>
      </div>
      <h3>${planet.name}</h3>
      ${coord ? `<p class="planet-region" style="--pa:${color}">${coord.region}</p>` : ""}
      <div class="detail-row">
        <div class="label">Clima / Terreno</div>
        <div class="value">${planet.climate} · ${planet.terrain}</div>
      </div>
      <div class="detail-row">
        <div class="label">População</div>
        <div class="value">${planet.population === "unknown" ? "Desconhecida" : Number(planet.population).toLocaleString("pt-BR")}</div>
      </div>
      <div class="detail-row" data-slot="species">
        <div class="label">Espécies presentes (derivado dos moradores)</div>
        <div class="pill-list"><span class="value">Carregando…</span></div>
      </div>
      <div class="detail-row" data-slot="films">
        <div class="label">Aparições (proxy de "acontecimentos")</div>
        <div class="pill-list"><span class="value">Carregando…</span></div>
      </div>
    `;

    card.querySelector(".planet-panel-close").addEventListener("click", () => {
      closePanel();
      recenter();
    });

    if (bigPlanet) bigPlanet.destroy();
    bigPlanet = createPlanetView(card.querySelector(".planet-canvas"), planet, {
      size: 160, spin, interactive: true,
    });
    bigPlanet.setPaused(!card.classList.contains("is-open"));
  }

  function fillDetail(detail) {
    if (!detail) return;
    const sp = card.querySelector('[data-slot="species"] .pill-list');
    const fl = card.querySelector('[data-slot="films"] .pill-list');
    if (sp) sp.innerHTML = pills(detail.species, "Nenhum morador catalogado");
    if (fl) {
      fl.innerHTML = pills(
        detail.films.map((f) => `Ep. ${f.episode} — ${f.title}`),
        "Nenhuma"
      );
    }
  }

  function paint(planet, coord, detail) {
    /* a região entra na chave: o mapa chega depois da primeira pintura */
    const key = `${planet.url}|${coord ? coord.region : ""}`;
    if (card.dataset.planet !== key) {
      buildShell(planet, coord);
      card.dataset.planet = key;
    }
    fillDetail(detail);
  }

  /* ---------- Zoom e pan ----------
     O zoom NÃO usa transform CSS no container: um container com
     `will-change: transform` vira uma camada rasterizada, e escalar essa
     camada é justamente o que pixelava o mapa. Aqui o zoom vai num <g> do
     SVG (geometria vetorial, redesenhada nítida em qualquer escala) e os
     marcadores, que são HTML, são reposicionados pela mesma conta — assim
     eles também não crescem junto com o mapa.

     Espaço do mapa: 0..100 em x e y, igual ao viewBox. Um ponto (x, y) cai
     na fração de tela `x * zoom + tx`. */
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 4;

  let zoom = 1;
  let tx = 0;
  let ty = 0;
  let zoomG = null;
  let markers = [];
  let tween = null;

  const clampPan = () => {
    const min = 100 - 100 * zoom;
    tx = Math.min(0, Math.max(min, tx));
    ty = Math.min(0, Math.max(min, ty));
  };

  /* largura do palco em cache: lê-la a cada quadro forçaria layout */
  let stageW = 0;
  const readStageW = () => { stageW = stage.clientWidth || 1; };
  addEventListener("resize", () => { readStageW(); applyTransform(); }, { passive: true });

  /* Enquanto o mapa se move, transições e o pulso dos marcadores saem do ar:
     são dezenas de elementos animando durante o gesto. */
  let movingTimer = 0;
  function markMoving() {
    stage.classList.add("is-moving");
    clearTimeout(movingTimer);
    movingTimer = setTimeout(() => stage.classList.remove("is-moving"), 100);
  }

  function applyTransform() {
    clampPan();
    if (zoomG) {
      zoomG.setAttribute("transform", `translate(${tx.toFixed(4)} ${ty.toFixed(4)}) scale(${zoom.toFixed(4)})`);
    }
    /* fontes e traços do SVG dividem por este valor para não crescer */
    stage.style.setProperty("--gx-zoom", String(zoom));

    /* Os marcadores são deslocados por `transform` e não por left/top: assim
       o quadro não dispara layout, só composição. A posição-base em % fica
       no atributo style do próprio elemento, escrita uma única vez. */
    if (!stageW) readStageW();
    const k = stageW / 100;
    for (const el of markers) {
      const dx = (Number(el.dataset.x) * (zoom - 1) + tx) * k;
      const dy = (Number(el.dataset.y) * (zoom - 1) + ty) * k;
      el.style.transform =
        `translate(-50%, -50%) translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    }
    scheduleRelayout();
  }

  /* Anima até um estado de zoom/pan; usado por Recentrar e pela busca. */
  function stopTween() {
    if (tween) {
      unsubscribe(tween);
      tween = null;
    }
  }

  function animateTo(z, nx, ny, ms = 480) {
    stopTween();
    const z0 = zoom;
    const x0 = tx;
    const y0 = ty;
    const t0 = performance.now();
    /* usa o laço único (js/fx/loop.js) e se desinscreve ao terminar */
    tween = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);   /* ease-out cúbico */
      zoom = z0 + (z - z0) * e;
      tx = x0 + (nx - x0) * e;
      ty = y0 + (ny - y0) * e;
      markMoving();
      applyTransform();
      if (k >= 1) stopTween();
    };
    subscribe(tween);
  }

  function recenter(animate = true) {
    if (animate) animateTo(1, 0, 0);
    else {
      stopTween();
      zoom = 1;
      tx = 0;
      ty = 0;
      applyTransform();
    }
  }

  /* Leva (xPct, yPct) para o centro da tela no nível pedido */
  function zoomToPoint(xPct, yPct, level = 2) {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, level));
    animateTo(z, 50 - xPct * z, 50 - yPct * z);
  }

  /* Zoom mantendo fixo o ponto sob o cursor */
  function zoomAt(clientX, clientY, next) {
    if (panDX || panDY) endDrag();
    const rect = stage.getBoundingClientRect();
    const fx = ((clientX - rect.left) / rect.width) * 100;
    const fy = ((clientY - rect.top) / rect.height) * 100;
    const mx = (fx - tx) / zoom;
    const my = (fy - ty) / zoom;
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    tx = fx - mx * zoom;
    ty = fy - my * zoom;
    applyTransform();
  }

  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    stopTween();
    markMoving();
    zoomAt(e.clientX, e.clientY, zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
  }, { passive: false });

  stage.addEventListener("dblclick", (e) => {
    if (e.target.closest(".galaxy-recenter, .map-search, .gx-canvas")) return;
    stopTween();
    markMoving();
    zoomAt(e.clientX, e.clientY, zoom * 2);
  });

  let dragging = false;
  let dragged = false;
  let startX = 0;
  let startY = 0;

  stage.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".galaxy-recenter, .map-search, .gx-canvas")) return;
    stopTween();
    dragging = true;
    dragged = false;
    startX = e.clientX;
    startY = e.clientY;
    stage.classList.add("is-dragging");
  });

  /* Durante o arrasto o SVG NÃO é redesenhado: o deslocamento vai num
     translate CSS do viewport inteiro, que o compositor resolve sem
     relayout nem repaint. Como é translação pura (nunca escala), não há
     rasterizar-e-esticar — o mapa continua nítido. No fim do gesto o
     deslocamento é incorporado a tx/ty e o SVG é redesenhado uma vez. */
  let panDX = 0;
  let panDY = 0;

  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    panDX += e.clientX - startX;
    panDY += e.clientY - startY;
    startX = e.clientX;
    startY = e.clientY;

    /* mesmo limite do clampPan, em px */
    const lim = stageW * (zoom - 1);
    panDX = Math.min(-tx * stageW / 100, Math.max(-lim - tx * stageW / 100, panDX));
    panDY = Math.min(-ty * stageW / 100, Math.max(-lim - ty * stageW / 100, panDY));

    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) dragged = true;
    markMoving();
    viewport.style.transform = `translate3d(${panDX.toFixed(1)}px, ${panDY.toFixed(1)}px, 0)`;
  });

  const endDrag = () => {
    if (dragging && (panDX || panDY)) {
      /* incorpora o deslocamento e redesenha o SVG uma única vez */
      tx += (panDX / stageW) * 100;
      ty += (panDY / stageW) * 100;
      panDX = 0;
      panDY = 0;
      viewport.style.transform = "";
      applyTransform();
    }
    dragging = false;
    stage.classList.remove("is-dragging");
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointerleave", endDrag);

  recenterBtn.addEventListener("click", () => recenter());

  /* ---------- Estado / seleção ---------- */
  let coords = new Map();

  /* O ponto do planeta selecionado vira o mesmo planeta procedural em 26px.
     É um único canvas, movido de marcador em marcador. */
  let miniCanvas = null;
  let miniPlanet = null;

  function markActive() {
    viewport.querySelectorAll(".gx-planet").forEach((el) => {
      el.classList.toggle("is-active", Number(el.dataset.index) === index);
    });

    const active = viewport.querySelector(".gx-planet.is-active");
    if (!active) return;

    if (!miniCanvas) {
      miniCanvas = document.createElement("canvas");
      miniCanvas.className = "gx-canvas";
      miniCanvas.setAttribute("aria-hidden", "true");
      miniPlanet = createPlanetView(miniCanvas, planets[index], {
        size: 24, slices: 24, spin, interactive: true,
      });
    } else {
      miniPlanet.setPlanet(planets[index]);
    }
    active.appendChild(miniCanvas);
  }

  async function show(newIndex, { open = true, zoomIn = false } = {}) {
    index = (newIndex + planets.length) % planets.length;
    const planet = planets[index];
    const coord = coords.get(planet.name);
    position.textContent = `${index + 1} / ${planets.length}`;

    /* O contador tem de refletir a posição real do planeta na lista da SWAPI
       — é daí que as setas seguem. Se algum caminho de seleção passar um
       índice que não corresponde ao planeta exibido, isto aparece no console. */
    console.assert(
      planets.indexOf(planet) === index,
      `#planet-position fora de sincronia: ${planet.name} está em ` +
        `${planets.indexOf(planet) + 1}, mas o contador mostra ${index + 1}.`
    );

    markActive();
    if (open) openPanel();
    if (zoomIn && coord) zoomToPoint(coord.x, coord.y);

    const myRequest = ++requestId;
    let detail = detailCache.get(planet.url);

    /* pinta já com o que veio na lista; o painel nunca fica vazio */
    paint(planet, coord, detail);
    if (detail) return;

    const [species, films] = await Promise.all([
      getPlanetSpecies(planet),
      getPlanetFilms(planet),
    ]);

    // Uma navegação mais recente já começou enquanto isto carregava —
    // descarta este resultado para não sobrescrever o planeta certo com
    // dados de um planeta que o usuário já deixou para trás.
    if (myRequest !== requestId) return;

    detail = { species, films };
    detailCache.set(planet.url, detail);
    paint(planet, coord, detail);
  }

  /* ---------- Monta o mapa quando o JSON chega ---------- */
  function buildMap(mapData) {
    coords = new Map(mapData.map((p) => [p.name, p]));

    const core = mapData.filter((p) => p.region === "Core");
    const cx = core.length ? core.reduce((s, p) => s + p.x, 0) / core.length : 50;
    const cy = core.length ? core.reduce((s, p) => s + p.y, 0) / core.length : 50;

    const shapes = buildRegionShapes(mapData, cx, cy);

    /* rótulos das regiões: cada um num ângulo diferente, na faixa da
       própria região, varrendo o lado esquerdo do mapa (menos planetas) */
    const BINS = 48;
    const labels = shapes
      .map((s, i) => {
        /* ângulos bem separados; as duas regiões internas vão para a
           borda do próprio blob, onde há espaço, e as externas ficam no
           meio da faixa */
        const angDeg = [305, 212, 246, 170, 142, 118, 96][i];
        const a = (angDeg * Math.PI) / 180;
        const bin = ((Math.round((a / (Math.PI * 2)) * BINS) % BINS) + BINS) % BINS;
        const rOut = s.radii[bin];
        const rIn = i === 0 ? 0 : shapes[i - 1].radii[bin];
        const rad = i <= 1 ? rOut * 0.94 : (rIn + rOut) / 2;
        const x = cx + rad * Math.cos(a);
        const y = cy + rad * Math.sin(a);
        return `<span class="gx-region-label" data-x="${x.toFixed(2)}" data-y="${y.toFixed(2)}"
                      style="left:${x.toFixed(1)}%; top:${y.toFixed(1)}%; --pa:${s.color}">${s.label}</span>`;
      })
      .join("") +
      /* um pouco acima de (10,50), onde fica o planeta "unknown" da SWAPI */
      `<span class="gx-region-label is-unknown" data-x="10" data-y="43"
             style="left:10%; top:43%">Unknown Regions</span>`;

    const dots = planets
      .map((planet, i) => {
        const c = coords.get(planet.name);
        if (!c) return "";
        const color = REGION_COLOR[c.region] || "#8a93a6";
        const big = (planet.films || []).length >= 3;
        const pop = planet.population === "unknown"
          ? "População desconhecida"
          : Number(planet.population).toLocaleString("pt-BR") + " hab.";
        const id = String(planet.url).split("/").filter(Boolean).pop();
        /* O <button> é o grupo do marcador: ponto, área de clique, nome e
           tooltip são filhos dele, então hover e clique valem no conjunto. */
        return `
          <button class="gx-planet planet-marker${big ? " is-big" : ""}" type="button"
                  data-index="${i}" data-planet-id="${id}" data-region="${c.region}"
                  data-name="${planet.name.toLowerCase()}" data-place="right"
                  data-x="${c.x}" data-y="${c.y}"
                  style="left:${c.x}%; top:${c.y}%; --pa:${color}"
                  aria-label="${planet.name}">
            <span class="gx-hit" aria-hidden="true"></span>
            <span class="gx-name">${planet.name}</span>
            <span class="gx-tip" aria-hidden="true">
              <strong>${planet.name}</strong>
              <em>${planet.climate} · ${pop}</em>
            </span>
          </button>`;
      })
      .join("");

    viewport.innerHTML =
      galaxyBackground(shapes, cx, cy) +
      `<div class="galaxy-overlay">${labels}${dots}</div>`;

    const svg = viewport.querySelector(".galaxy-bg");
    zoomG = svg.querySelector(".gx-zoom");
    markers = [...viewport.querySelectorAll(".gx-planet, .gx-region-label")];
    readStageW();
    applyTransform();

    /* braços espirais: filtro rodado uma vez, fora da tela */
    bakeArms(galaxyBackground.lastArms).then((png) => {
      if (!png) return;
      const img = svg.querySelector(".gx-arms");
      const fb = svg.querySelector(".gx-arms-fallback");
      if (!img) return;
      img.setAttribute("href", png);
      img.style.display = "";
      if (fb) fb.remove();
    });

    viewport.addEventListener("click", (e) => {
      const el = e.target.closest(".gx-planet");
      if (!el || dragged) return;
      show(Number(el.dataset.index));
    });

    /* hover: acende a região do planeta e apaga as outras */
    viewport.addEventListener("pointerover", (e) => {
      const el = e.target.closest(".gx-planet");
      if (!el) return;
      svg.classList.add("is-focusing");
      svg.querySelectorAll(".gx-region").forEach((r) => {
        r.classList.toggle("is-hot", r.dataset.region === el.dataset.region);
      });
    });

    viewport.addEventListener("pointerout", (e) => {
      if (e.target.closest(".gx-planet")) {
        svg.classList.remove("is-focusing");
        svg.querySelectorAll(".gx-region").forEach((r) => r.classList.remove("is-hot"));
      }
    });

    markActive();
    layoutNames();
  }

  /* Em zoom maior sobra espaço entre os pontos, então vale refazer a
     distribuição dos nomes — mas só quando o gesto termina. */
  let relayoutTimer = 0;
  let lastLayoutZoom = -1;

  function scheduleRelayout() {
    if (!markers.length || zoom === lastLayoutZoom) return;
    clearTimeout(relayoutTimer);
    relayoutTimer = setTimeout(() => {
      lastLayoutZoom = zoom;
      layoutNames();
    }, 200);
  }

  /* Escolhe de que lado cada nome fica para não sobrepor outro nome nem
     um rótulo de região; quem não acha lugar só mostra o nome no hover. */
  function layoutNames() {
    const hits = (a, b) =>
      a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

    const run = () => {
      const boxes = [];
      viewport.querySelectorAll(".gx-region-label").forEach((el) => {
        boxes.push(el.getBoundingClientRect());
      });

      const els = [...viewport.querySelectorAll(".gx-planet")];

      /* Os próprios pontos entram como obstáculo: além de ficar mais legível,
         impede que o nome de um planeta cubra o ponto do vizinho e roube o
         clique dele. */
      for (const el of els) {
        const r = el.getBoundingClientRect();
        boxes.push({
          left: r.left - 2, right: r.right + 2,
          top: r.top - 2, bottom: r.bottom + 2,
        });
      }

      /* planetas mais presentes nos filmes escolhem lugar primeiro */
      els.sort((a, b) =>
        (b.classList.contains("is-big") ? 1 : 0) - (a.classList.contains("is-big") ? 1 : 0));

      for (const el of els) {
        const name = el.querySelector(".gx-name");
        el.classList.remove("is-crowded");
        let placed = false;
        for (const place of ["right", "left", "top", "bottom"]) {
          el.dataset.place = place;
          const r = name.getBoundingClientRect();
          if (!boxes.some((b) => hits(b, r))) {
            boxes.push(r);
            placed = true;
            break;
          }
        }
        if (!placed) {
          el.dataset.place = "right";
          el.classList.add("is-crowded");
        }
      }
    };

    /* espera as fontes para medir a largura real do texto */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => requestAnimationFrame(run));
    } else {
      requestAnimationFrame(run);
    }
  }

  /* ---------- Eventos gerais ---------- */
  prevBtn.addEventListener("click", () => show(index - 1, { zoomIn: false }));
  nextBtn.addEventListener("click", () => show(index + 1, { zoomIn: false }));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePanel();
      recenter();
    }
  });

  /* Fechar clicando fora: só quando o gesto COMEÇOU e TERMINOU fora, e
     nenhum arrasto está em curso. Sem isso, arrastar o planeta do painel e
     soltar o mouse fora dele fechava o painel no meio do gesto. */
  const KEEP_OPEN = "#planet-card, .gx-planet, .orbit-controls, .map-search," +
    " .galaxy-recenter, .planet-canvas, .gx-canvas";

  const dentro = (target) =>
    target && target.closest ? Boolean(target.closest(KEEP_OPEN)) : true;

  let pressedOutside = false;

  /* fase de captura: roda antes do stopPropagation do canvas do planeta */
  document.addEventListener("pointerdown", (e) => {
    pressedOutside = !dentro(e.target);
  }, true);

  document.addEventListener("click", (e) => {
    if (!card.classList.contains("is-open")) return;
    if (spin.dragging || document.body.classList.contains("is-dragging")) return;
    if (!pressedOutside) return;
    if (dentro(e.target)) return;
    closePanel();
  });

  /* ---------- Busca com autocomplete ---------- */
  let suggestions = [];
  let activeSuggestion = -1;

  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function closeSuggest() {
    suggestions = [];
    activeSuggestion = -1;
    suggestList.hidden = true;
    suggestList.innerHTML = "";
    searchInput.setAttribute("aria-expanded", "false");
    searchInput.removeAttribute("aria-activedescendant");
  }

  function markSuggestion() {
    [...suggestList.children].forEach((li, i) => {
      const on = i === activeSuggestion;
      li.classList.toggle("is-active", on);
      li.setAttribute("aria-selected", String(on));
    });
    if (activeSuggestion >= 0) {
      searchInput.setAttribute("aria-activedescendant", `planet-suggest-${activeSuggestion}`);
    } else {
      searchInput.removeAttribute("aria-activedescendant");
    }
  }

  function renderSuggest(term) {
    suggestions = term
      ? planets.filter((p) => p.name.toLowerCase().includes(term)).slice(0, 6)
      : [];

    if (!suggestions.length) {
      closeSuggest();
      return;
    }

    const re = new RegExp(`(${escapeRe(term)})`, "i");
    suggestList.innerHTML = suggestions
      .map((p, i) => {
        const c = coords.get(p.name);
        const color = REGION_COLOR[c ? c.region : ""] || "#8a93a6";
        return `<li class="map-suggest-item" role="option" id="planet-suggest-${i}"
                    aria-selected="false" data-i="${i}">
                  <span class="map-suggest-dot" style="--pa:${color}"></span>
                  <span class="map-suggest-name">${p.name.replace(re, "<mark>$1</mark>")}</span>
                  <span class="map-suggest-region">${c ? c.region : "—"}</span>
                </li>`;
      })
      .join("");

    suggestList.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
    activeSuggestion = -1;
    markSuggestion();
  }

  /* Enquanto digita: quem não bate some no fundo, quem bate ganha halo */
  function highlight(term) {
    viewport.querySelectorAll(".gx-planet").forEach((el) => {
      const match = Boolean(term) && (el.dataset.name || "").includes(term);
      el.classList.toggle("is-dim", Boolean(term) && !match);
      el.classList.toggle("is-match", match);
    });
  }

  let searchDebounce = null;

  function goTo(planet) {
    clearTimeout(searchDebounce);
    const found = planets.indexOf(planet);
    if (found !== -1) show(found, { zoomIn: true });
  }

  function selectSuggestion(i) {
    const planet = suggestions[i];
    if (!planet) return;
    searchInput.value = planet.name;
    closeSuggest();
    highlight(planet.name.toLowerCase());
    goTo(planet);
  }

  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.trim().toLowerCase();
    clearTimeout(searchDebounce);
    renderSuggest(term);
    highlight(term);
    if (!term) return;
    // Espera uma pausa na digitação antes de navegar — sem isso, cada tecla
    // de um nome digitado rápido podia disparar seu próprio carregamento de
    // planeta (cada um com sua leva de requisições à SWAPI).
    searchDebounce = setTimeout(() => {
      const found = planets.findIndex((p) => p.name.toLowerCase().includes(term));
      if (found !== -1) show(found, { zoomIn: true });
    }, 250);
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!suggestions.length) return;
      e.preventDefault();
      activeSuggestion += e.key === "ArrowDown" ? 1 : -1;
      if (activeSuggestion < 0) activeSuggestion = suggestions.length - 1;
      if (activeSuggestion >= suggestions.length) activeSuggestion = 0;
      markSuggestion();
      return;
    }

    if (e.key === "Enter") {
      if (!suggestions.length) return;
      e.preventDefault();
      selectSuggestion(activeSuggestion >= 0 ? activeSuggestion : 0);
      return;
    }

    if (e.key === "Escape" && !suggestList.hidden) {
      /* fecha só a lista; o Esc do documento fecha o painel */
      e.stopPropagation();
      closeSuggest();
    }
  });

  /* mousedown em vez de click: seleciona antes de o campo perder o foco */
  suggestList.addEventListener("mousedown", (e) => {
    const li = e.target.closest(".map-suggest-item");
    if (!li) return;
    e.preventDefault();
    selectSuggestion(Number(li.dataset.i));
  });

  searchInput.addEventListener("blur", () => setTimeout(closeSuggest, 120));

  /* O painel e os controles funcionam mesmo se o JSON do mapa falhar */
  show(0);

  fetch(MAP_URL)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then((mapData) => {
      buildMap(mapData);

      /* Veio do modal de Personagens (planeta natal): já abre nele */
      const intent = takeIntent("planets");
      const alvo = intent ? planets.findIndex((p) => p.name === intent.name) : -1;
      if (alvo !== -1) show(alvo, { zoomIn: true });
      else show(index, { open: card.classList.contains("is-open") });
    })
    .catch(() => {
      viewport.innerHTML = `<p class="state-msg">Não foi possível carregar o mapa da galáxia.</p>`;
    });
}
