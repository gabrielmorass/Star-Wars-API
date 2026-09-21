import { setIntent, takeIntent } from "../../core/nav-intent.js";
import { ANOS_FILMES, anoDoEpisodio, romanoDe } from "../../core/saga.js";
import { posterDe } from "./poster-art.js";
import { posterDoTmdb } from "./tmdb.js";
import {
  getPeopleMap,
  getPlanetsMap,
  getNavesMap,
  getSpeciesFullMap,
} from "./api.js";
import { getPortraits } from "../people/api.js";
import { miniAvatar, speciesColor } from "../people/avatar.js";
import { createPlanetView } from "../planets/planet-art.js";

/* ---------------- Filmes ----------------
   A grade é de pôsteres: a arte de cada episódio é desenhada em SVG aqui no
   projeto (js/features/films/poster-art.js), sem imagem externa nenhuma.

   O texto de abertura completo vive sempre dentro de `.film-crawl`, no DOM,
   independente da aba aberta ou da animação estar rodando — a animação mexe
   em transform, nunca no conteúdo. */

const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const PONTEIRO_FINO = window.matchMedia("(pointer: fine)").matches;

/* Extremos da barra de cronologia da grade (a linha do tempo de Personagens
   usa outro recorte, porque lá entram nascimentos de séculos atrás). */
const SAGA_MIN = -40;
const SAGA_MAX = 10;

function dataBR(iso) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/* As linhas do crawl são curtas e quebradas como no filme; duas delas param
   no meio da frase, daí as reticências. */
function duasLinhas(crawl) {
  const texto = String(crawl || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
  return texto.replace(/[^.!?]$/, "$&…");
}

function escapar(texto) {
  return String(texto).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

export function renderFilmsView(container, films, navigate) {
  container.innerHTML = `
    <div class="films-view">
      <div class="people-toolbar films-bar">
        <input type="search" id="films-search" placeholder="Buscar filme por título…" aria-label="Buscar filme" />
        <div class="filter-pills film-order" role="group" aria-label="Ordem dos filmes">
          <button class="filter-pill is-on" type="button" data-order="release">Lançamento</button>
          <button class="filter-pill" type="button" data-order="chrono">Cronológica</button>
        </div>
      </div>
      <div class="saga-bar" role="group" aria-label="Cronologia galáctica dos episódios">
        <span class="sb-line"></span>
        <span class="sb-ends"><i>40BBY</i><i>10ABY</i></span>
        <div class="sb-dots"></div>
      </div>
      <div class="card-grid" id="films-grid"></div>
    </div>
  `;

  const grid = container.querySelector("#films-grid");
  const searchInput = container.querySelector("#films-search");
  const orderButtons = [...container.querySelectorAll("[data-order]")];
  const dots = container.querySelector(".sb-dots");

  let ordem = "release";
  let visible = [];
  /* que filme está em cada card — sobrevive ao FLIP, que move os nós sem
     recriá-los */
  const filmeDoCard = new WeakMap();

  const COMPARADORES = {
    release: (a, b) => new Date(a.release_date) - new Date(b.release_date),
    chrono: (a, b) => a.episode_id - b.episode_id,
  };

  /* ---------- Barra de cronologia galáctica ---------- */
  function montarBarra() {
    dots.innerHTML = "";
    ANOS_FILMES.forEach((f, i) => {
      const filme = films.find((x) => Number(x.episode_id) === f.ep);
      if (!filme) return;
      const pct = ((f.ano - SAGA_MIN) / (SAGA_MAX - SAGA_MIN)) * 100;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sb-dot";
      /* Ep. IV, V e VI caem em 4 anos: os rótulos alternam duas alturas */
      b.style.setProperty("--alt", String(i % 2));
      b.style.left = `${pct}%`;
      b.title = `Episódio ${f.romano} — ${filme.title} (${f.ano === 0 ? "0" : Math.abs(f.ano) + (f.ano < 0 ? "BBY" : "ABY")})`;
      b.setAttribute("aria-label", b.title);
      b.innerHTML = `<i></i><b>Ep. ${f.romano}</b>`;
      b.addEventListener("click", () => abrirModal(filme, null));
      dots.appendChild(b);
    });

    const yavin = document.createElement("span");
    yavin.className = "sb-yavin";
    yavin.style.left = `${((0 - SAGA_MIN) / (SAGA_MAX - SAGA_MIN)) * 100}%`;
    yavin.innerHTML = `<i></i><b>Batalha de Yavin</b>`;
    dots.appendChild(yavin);
  }

  /* ---------- Grade de pôsteres ---------- */
  function paint(list) {
    visible = list;

    if (!list.length) {
      grid.innerHTML = `<p class="state-msg">Nenhum filme encontrado.</p>`;
      return;
    }

    grid.innerHTML = list
      .map((f, i) => {
        const arte = posterDe(f.episode_id);
        const naves = (f.starships || []).length;
        return `
        <button class="info-card film-card" data-index="${i}" type="button"
                style="--f1:${arte.f1}; --f2:${arte.f2}; --i:${i}">
          <span class="fc-art" aria-hidden="true">${arte.svg}</span>
          <span class="fc-roman" aria-hidden="true">${romanoDe(f.episode_id)}</span>
          <span class="fc-sheen" aria-hidden="true"></span>
          <span class="fc-body">
            <h3>${escapar(f.title)}</h3>
            <span class="meta">${dataBR(f.release_date)} · Dir. ${escapar(f.director)}</span>
            <span class="fc-stats">${(f.characters || []).length} personagens · ${(f.planets || []).length} planetas · ${naves} naves</span>
          </span>
          <span class="fc-crawl" aria-hidden="true">${escapar(duasLinhas(f.opening_crawl))}</span>
        </button>`;
      })
      .join("");

    grid.querySelectorAll(".film-card").forEach((el, i) => {
      filmeDoCard.set(el, list[i]);
      el.addEventListener("click", () => abrirModal(filmeDoCard.get(el), el));
    });

    if (PONTEIRO_FINO && !REDUCE) ligarTilt();
  }

  /* ---------- Tilt 3D de até 8° ---------- */
  function ligarTilt() {
    const MAX = 8;
    grid.querySelectorAll(".film-card").forEach((el) => {
      if (el.dataset.tilt === "1") return;
      el.dataset.tilt = "1";
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform =
          `perspective(700px) rotateX(${(-ny * 2 * MAX).toFixed(2)}deg) rotateY(${(nx * 2 * MAX).toFixed(2)}deg) translateY(-4px)`;
        el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
      }, { passive: true });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; }, { passive: true });
    });
  }

  /* ---------- Reordenar com FLIP ---------- */
  function ordenarComFlip() {
    const cards = [...grid.querySelectorAll(".film-card")];
    if (cards.length < 2) {
      visible = [...visible].sort(COMPARADORES[ordem]);
      return;
    }

    const antes = new Map(cards.map((el) => [el, el.getBoundingClientRect()]));

    visible = [...visible].sort(COMPARADORES[ordem]);
    const posicao = new Map(visible.map((f, i) => [f, i]));
    cards
      .slice()
      .sort((a, b) => posicao.get(filmeDoCard.get(a)) - posicao.get(filmeDoCard.get(b)))
      .forEach((el, i) => {
        el.dataset.index = String(i);
        grid.appendChild(el);
      });

    if (REDUCE || !cards[0].animate) return;
    for (const el of cards) {
      const a = antes.get(el);
      const d = el.getBoundingClientRect();
      const dx = a.left - d.left;
      const dy = a.top - d.top;
      if (!dx && !dy) continue;
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        { duration: 250, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
      );
    }
  }

  function aplicarBusca() {
    const termo = searchInput.value.trim().toLowerCase();
    paint(
      films
        .filter((f) => !termo || f.title.toLowerCase().includes(termo))
        .sort(COMPARADORES[ordem])
    );
  }

  orderButtons.forEach((b) => {
    b.addEventListener("click", () => {
      if (ordem === b.dataset.order) return;
      ordem = b.dataset.order;
      orderButtons.forEach((x) => x.classList.toggle("is-on", x === b));
      ordenarComFlip();
    });
  });

  searchInput.addEventListener("input", aplicarBusca);

  function abrirModal(filme, origemEl) {
    const lista = visible.length ? visible : [...films].sort(COMPARADORES[ordem]);
    const i = lista.indexOf(filme);
    renderFilmModal(filme, {
      list: lista,
      index: i < 0 ? 0 : i,
      cardEl: origemEl,
      navigate,
    });
  }

  montarBarra();
  aplicarBusca();

  /* Veio de outra tela com um episódio em mente (a pill "Aparições" de Naves
     e Veículos): abre o modal desse filme já de cara. Sem intenção, nada
     muda. */
  const intent = takeIntent("films");
  if (intent) {
    const alvo = films.find(
      (f) =>
        (intent.episode && Number(f.episode_id) === Number(intent.episode)) ||
        (intent.name && f.title === intent.name)
    );
    if (alvo) abrirModal(alvo, null);
  }
}

/* ================= Modal ================= */

const ABAS = [
  ["crawl", "Abertura"],
  ["cast", "Elenco"],
  ["planets", "Planetas"],
  ["craft", "Naves e Veículos"],
  ["species", "Espécies"],
];

function esqueleto(quantos, classe) {
  return Array.from({ length: quantos }, () => `<span class="fm-skel ${classe}"></span>`).join("");
}

export function renderFilmModal(film, ctx = {}) {
  const { list = [film], navigate } = ctx;
  let index = ctx.index ?? 0;
  let origem = ctx.cardEl || null;
  let atual = film;
  let fechando = false;
  let pedido = 0;
  const planetasVivos = [];

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop is-film";
  backdrop.innerHTML = `
    <button class="modal-nav modal-nav--prev" type="button" aria-label="Filme anterior">‹</button>
    <div class="modal modal-film" role="dialog" aria-modal="true" aria-label="Detalhes do filme" data-sem-claquete="1">
      <button class="modal-close" type="button" aria-label="Fechar">×</button>
      <div class="fm-head">
        <span class="fm-head-bg" aria-hidden="true"></span>
        <span class="fm-roman" aria-hidden="true"></span>
        <div class="fm-headtext">
          <h3></h3>
          <div class="fm-pills"></div>
        </div>
      </div>
      <div class="fm-tabs" role="tablist">
        ${ABAS.map(
          ([id, rotulo], i) =>
            `<button class="fm-tab${i === 0 ? " is-on" : ""}" type="button" role="tab" data-panel="${id}" aria-selected="${i === 0}">${rotulo}</button>`
        ).join("")}
      </div>
      <div class="fm-panels">
        <div class="fm-panel" data-panel="crawl" role="tabpanel">
          <div class="film-crawl-stage crawl-stage">
            <div class="crawl-sky" aria-hidden="true"></div>
            <!-- A frase azul e o flash moram numa camada à parte de propósito:
                 filhos diretos do palco eles herdam a perspective e viram
                 camada 3D, e aí a animação deles não pinta (o mesmo problema
                 do bloco do crawl). Um nível abaixo, a perspective não os
                 alcança e eles voltam a ser 2D normais. -->
            <div class="crawl-hud">
              <p class="crawl-intro">Há muito tempo, numa galáxia muito, muito distante...</p>
              <p class="crawl-flash" aria-hidden="true">
                <span class="crawl-flash-ep"></span><span class="crawl-flash-name"></span>
              </p>
            </div>
            <!-- .crawl-road é o "chão" inclinado, ancorado na borda de baixo
                 do palco. Quem sobe é o .film-crawl por cima dele: assim cada
                 linha passa pela base em tamanho real e vai encolhendo à
                 medida que se afasta. Com o rotateX no próprio bloco de texto,
                 a ancoragem seria a base DO TEXTO, e aí nenhuma linha chegava
                 a aparecer em tamanho cheio. -->
            <div class="crawl-road">
              <div class="film-crawl">
                <h4 class="crawl-title"><span class="crawl-ep"></span><span class="crawl-name"></span></h4>
                <p class="crawl-body"></p>
              </div>
            </div>
            <div class="crawl-fade" aria-hidden="true"></div>
          </div>
          <div class="crawl-ctrl">
            <button class="crawl-btn" type="button" data-act="toggle">Pausar</button>
            <button class="crawl-btn" type="button" data-act="restart">Reiniciar</button>
            <button class="crawl-btn" type="button" data-act="full">Tela cheia</button>
            <span class="crawl-dica">Espaço pausa e retoma</span>
          </div>
        </div>
        <div class="fm-panel" data-panel="cast" role="tabpanel" hidden></div>
        <div class="fm-panel" data-panel="planets" role="tabpanel" hidden></div>
        <div class="fm-panel" data-panel="craft" role="tabpanel" hidden></div>
        <div class="fm-panel" data-panel="species" role="tabpanel" hidden></div>
      </div>
    </div>
    <button class="modal-nav modal-nav--next" type="button" aria-label="Próximo filme">›</button>
  `;
  document.body.appendChild(backdrop);

  const modal = backdrop.querySelector(".modal-film");
  const cabecalho = backdrop.querySelector(".fm-head");
  const fundoCabecalho = backdrop.querySelector(".fm-head-bg");
  const roman = backdrop.querySelector(".fm-roman");
  const titulo = backdrop.querySelector("h3");
  const pills = backdrop.querySelector(".fm-pills");
  const tabs = [...backdrop.querySelectorAll(".fm-tab")];
  const paineis = new Map(
    [...backdrop.querySelectorAll(".fm-panel")].map((p) => [p.dataset.panel, p])
  );
  const palco = backdrop.querySelector(".crawl-stage");
  const crawlEl = backdrop.querySelector(".crawl-body");
  const btnToggle = backdrop.querySelector('[data-act="toggle"]');

  if (list.length < 2) backdrop.querySelectorAll(".modal-nav").forEach((b) => b.remove());

  /* ---------- FLIP: o pôster cresce até a área do modal ---------- */
  function voar(paraTras) {
    if (!origem || REDUCE || !modal.animate) return null;
    const c = origem.getBoundingClientRect();
    const m = modal.getBoundingClientRect();
    if (!c.width || !m.width) return null;

    const fantasma = document.createElement("div");
    fantasma.className = "fm-ghost";
    fantasma.setAttribute("aria-hidden", "true");
    fantasma.innerHTML = posterDe(atual.episode_id).svg;
    document.body.appendChild(fantasma);

    const noCard = {
      left: `${c.left}px`, top: `${c.top}px`,
      width: `${c.width}px`, height: `${c.height}px`,
      borderRadius: "18px", opacity: 1,
    };
    const noModal = {
      left: `${m.left}px`, top: `${m.top}px`,
      width: `${m.width}px`, height: `${m.height}px`,
      borderRadius: "28px", opacity: 0,
    };
    const opcoes = { duration: 300, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "forwards" };

    const anim = fantasma.animate(paraTras ? [noModal, noCard] : [noCard, noModal], opcoes);
    anim.onfinish = () => fantasma.remove();

    modal.animate(
      paraTras
        ? [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.94)" }]
        : [{ opacity: 0, transform: "scale(0.94)" }, { opacity: 1, transform: "scale(1)" }],
      { duration: 300, easing: "ease-out" }
    );
    backdrop.animate(
      paraTras ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }],
      { duration: 300, easing: "ease-out" }
    );
    return 300;
  }

  function sumir() {
    planetasVivos.forEach((v) => v.destroy?.());
    planetasVivos.length = 0;
    pararCrawl();
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("fullscreenchange", aoMudarTelaCheia);
    window.removeEventListener("resize", aoRedimensionar);
    if (document.fullscreenElement === palco) document.exitFullscreen?.();
    backdrop.remove();
  }

  function close() {
    if (fechando) return;
    fechando = true;
    const ms = voar(true);
    if (!ms) { sumir(); return; }
    backdrop.style.pointerEvents = "none";
    setTimeout(sumir, ms);
  }

  function pular(passo) {
    if (list.length < 2) return;
    index = (index + passo + list.length) % list.length;
    origem = null;                /* só a primeira abertura nasce do pôster */
    mostrar(list[index]);
  }

  function onKey(e) {
    if (e.key === "Escape") {
      /* em tela cheia o Esc é do navegador: ele sai da tela cheia e o modal
         continua aberto, senão o filme fechava junto */
      if (document.fullscreenElement) return;
      close();
      return;
    }
    if (e.key === "ArrowLeft") { e.preventDefault(); pular(-1); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); pular(1); return; }
    /* espaço pausa/retoma, mas não quando o foco está num controle —
       lá o espaço é o "clicar" do teclado */
    if (e.code === "Space" && !e.target.closest("button, input, select, textarea")) {
      e.preventDefault();
      alternarCrawl();
    }
  }

  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector(".modal-close").addEventListener("click", close);
  backdrop.querySelector(".modal-nav--prev")?.addEventListener("click", () => pular(-1));
  backdrop.querySelector(".modal-nav--next")?.addEventListener("click", () => pular(1));
  document.addEventListener("keydown", onKey);

  /* ---------- A subida do crawl ----------
     Quem move o bloco é este rAF, escrevendo `top` em pixel — não uma
     @keyframes.

     Por quê: o bloco tem `rotateX` estático dentro de um contêiner com
     `perspective`, e basta existir uma animação CSS viva sobre ele para o
     Chrome promovê-lo a camada de composição que nunca é pintada. O texto
     continua no DOM, com a geometria certa e clicável, e mesmo assim
     invisível. Medido nas duas pontas: com `animation: none` e o mesmo `top`
     aplicado inline, o crawl aparece; com a animação rodando (mesmo pausada),
     a tela fica preta. É um elemento só, então o custo de layout por quadro
     é aceitável.

     A frase azul e o flash do título continuam em CSS: são 2D e pintam. */
  const CRAWL_DUR = 70000;      /* ~70s de subida, velocidade constante */
  const CRAWL_ATRASO = 3700;    /* frase azul (2s) + flash do título (1,5s) */

  const blocoCrawl = backdrop.querySelector(".film-crawl");
  let rafCrawl = 0;
  let inicioCrawl = 0;   /* instante em que a subida começa (pode ser futuro) */
  let paradoEm = 0;      /* ms decorridos guardados na pausa */
  let deCrawl = 0;
  let ateCrawl = 0;

  /* De onde e até onde o `top` do texto anda, em coordenadas do chão.
     Começa em `palcoH` (a linha de baixo do palco, escala 1:1) e precisa ir
     até a última linha sumir acima do topo.

     "Sumir" não é simplesmente sair do palco: o chão é projetado, então um
     ponto a `u` pixels acima da base aparece na tela em

         y = palcoH - cos(a)·u · d / (d + sen(a)·u)

     Igualando a zero sai o `u` a partir do qual a linha está acima do topo:

         u = palcoH · d / (cos(a)·d - sen(a)·palcoH)

     Um percurso fixo em porcentagem erraria isso para mais (segundos de tela
     preta no fim) ou para menos (texto ainda visível quando o laço reinicia),
     porque o valor depende do tamanho do palco e do tamanho do texto, e os
     dois mudam por filme e por viewport.

     O denominador zera num palco muito alto (o horizonte cairia dentro dele);
     aí não existe ponto de sumiço e o fallback é um percurso generoso. */
  function medirPercursoDoCrawl() {
    const altura = blocoCrawl.offsetHeight || 800;
    const palcoH = palco.clientHeight || 600;
    const estilo = getComputedStyle(palco);
    const graus = parseFloat(estilo.getPropertyValue("--crawl-tilt")) || 24;
    const d = parseFloat(estilo.perspective) || 380;
    const a = (graus * Math.PI) / 180;

    const den = Math.cos(a) * d - Math.sin(a) * palcoH;
    const some = den > 1 ? (palcoH * d) / den : palcoH * 4;

    deCrawl = palcoH;
    ateCrawl = palcoH - some - altura - 40;
  }

  function posicionarCrawl(ms) {
    const t = (Math.max(0, ms) % CRAWL_DUR) / CRAWL_DUR;
    blocoCrawl.style.top = `${deCrawl + (ateCrawl - deCrawl) * t}px`;
  }

  function passoCrawl(agora) {
    posicionarCrawl(agora - inicioCrawl);
    rafCrawl = requestAnimationFrame(passoCrawl);
  }

  function pararCrawl() {
    if (rafCrawl) cancelAnimationFrame(rafCrawl);
    rafCrawl = 0;
  }

  /* ---------- Controles do crawl ---------- */
  function alternarCrawl() {
    if (REDUCE) return;
    const pausado = palco.classList.toggle("is-paused");
    btnToggle.textContent = pausado ? "Retomar" : "Pausar";
    btnToggle.setAttribute("aria-pressed", String(pausado));
    if (pausado) {
      paradoEm = performance.now() - inicioCrawl;
      pararCrawl();
    } else {
      inicioCrawl = performance.now() - paradoEm;
      if (!rafCrawl) rafCrawl = requestAnimationFrame(passoCrawl);
    }
  }

  function reiniciarCrawl() {
    palco.classList.remove("is-paused");
    btnToggle.textContent = "Pausar";
    btnToggle.setAttribute("aria-pressed", "false");
    palco.classList.remove("is-rolling");
    /* forçar reflow reinicia as animações CSS da frase azul e do flash */
    void palco.offsetWidth;
    pararCrawl();
    medirPercursoDoCrawl();
    posicionarCrawl(0);
    if (REDUCE) return;
    palco.classList.add("is-rolling");
    /* o início fica no futuro: até lá o bloco espera na borda de baixo */
    inicioCrawl = performance.now() + CRAWL_ATRASO;
    paradoEm = -CRAWL_ATRASO;
    rafCrawl = requestAnimationFrame(passoCrawl);
  }

  const btnFull = backdrop.querySelector('[data-act="full"]');

  /* O percurso depende da altura do palco e da altura do texto — as duas
     mudam ao entrar em tela cheia e ao redimensionar a janela. Remede sem
     reiniciar: a subida continua de onde está. */
  function aoRedimensionar() {
    medirPercursoDoCrawl();
  }
  window.addEventListener("resize", aoRedimensionar);

  function aoMudarTelaCheia() {
    const cheio = document.fullscreenElement === palco;
    btnFull.textContent = cheio ? "Sair da tela cheia" : "Tela cheia";
    palco.classList.toggle("is-full", cheio);
    medirPercursoDoCrawl();
  }
  document.addEventListener("fullscreenchange", aoMudarTelaCheia);

  backdrop.querySelector(".crawl-ctrl").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    if (btn.dataset.act === "toggle") alternarCrawl();
    if (btn.dataset.act === "restart") reiniciarCrawl();
    if (btn.dataset.act === "full") {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else palco.requestFullscreen?.().catch(() => {});
    }
  });

  /* ---------- Abas ---------- */
  const carregadas = new Set();

  function trocarAba(nome) {
    tabs.forEach((t) => {
      const on = t.dataset.panel === nome;
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-selected", String(on));
    });
    paineis.forEach((p, id) => { p.hidden = id !== nome; });
    /* A Abertura é uma projeção: o cartão abre para quase a tela toda e o
       fundo vira preto. As outras abas voltam ao tamanho de leitura. */
    modal.classList.toggle("is-cinema", nome === "crawl");
    backdrop.classList.toggle("is-cinema", nome === "crawl");
    if (nome !== "crawl") carregarAba(nome);
  }

  tabs.forEach((t) => t.addEventListener("click", () => trocarAba(t.dataset.panel)));

  async function carregarAba(nome) {
    const painel = paineis.get(nome);
    const chave = `${atual.episode_id}:${nome}`;
    if (carregadas.has(chave)) return;
    carregadas.add(chave);

    const meu = pedido;
    painel.innerHTML =
      nome === "cast" ? `<div class="fm-cast">${esqueleto(10, "fm-skel--cast")}</div>`
      : nome === "planets" ? `<div class="fm-planets">${esqueleto(4, "fm-skel--planet")}</div>`
      : `<div class="pill-list">${esqueleto(6, "fm-skel--pill")}</div>`;

    try {
      if (nome === "cast") {
        const [mapa, retratos] = await Promise.all([getPeopleMap(), getPortraits()]);
        if (meu !== pedido) return;
        const gente = (atual.characters || []).map((u) => mapa.get(u)).filter(Boolean);
        const caixa = document.createElement("div");
        caixa.className = "fm-cast";
        if (!gente.length) caixa.innerHTML = `<span class="value">Sem elenco listado.</span>`;
        for (const p of gente) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "fm-person";
          b.appendChild(miniAvatar(p, 48, retratos));
          const nome2 = document.createElement("span");
          nome2.textContent = p.name;
          b.appendChild(nome2);
          b.addEventListener("click", () => {
            if (!navigate) return;
            setIntent("people", { name: p.name });
            close();
            navigate("people");
          });
          caixa.appendChild(b);
        }
        painel.replaceChildren(caixa);
        return;
      }

      if (nome === "planets") {
        const mapa = await getPlanetsMap();
        if (meu !== pedido) return;
        const lista = (atual.planets || []).map((u) => mapa.get(u)).filter(Boolean);
        const caixa = document.createElement("div");
        caixa.className = "fm-planets";
        if (!lista.length) caixa.innerHTML = `<span class="value">Sem planetas listados.</span>`;
        for (const pl of lista) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "fm-planet";
          const cv = document.createElement("canvas");
          cv.setAttribute("aria-hidden", "true");
          b.appendChild(cv);
          const nome2 = document.createElement("span");
          nome2.textContent = pl.name;
          b.appendChild(nome2);
          b.addEventListener("click", () => {
            if (!navigate) return;
            setIntent("planets", { name: pl.name });
            close();
            navigate("planets");
          });
          caixa.appendChild(b);
          planetasVivos.push(createPlanetView(cv, pl, { size: 48, slices: 32 }));
        }
        painel.replaceChildren(caixa);
        return;
      }

      if (nome === "craft") {
        const mapa = await getNavesMap();
        if (meu !== pedido) return;
        const itens = [...(atual.starships || []), ...(atual.vehicles || [])]
          .map((u) => mapa.get(u))
          .filter(Boolean);
        painel.innerHTML = itens.length
          ? `<div class="pill-list">${itens
              .map((c) => `<button class="pill pill-link" type="button" data-kind="${c.kind}" data-name="${escapar(c.name)}">${escapar(c.name)}</button>`)
              .join("")}</div>`
          : `<span class="value">Sem naves ou veículos listados.</span>`;
        painel.querySelectorAll(".pill-link").forEach((b) => {
          b.addEventListener("click", () => {
            if (!navigate) return;
            setIntent("vehicles", { kind: b.dataset.kind, name: b.dataset.name });
            close();
            navigate("vehicles");
          });
        });
        return;
      }

      if (nome === "species") {
        const mapa = await getSpeciesFullMap();
        if (meu !== pedido) return;
        const itens = (atual.species || []).map((u) => mapa.get(u)).filter(Boolean);
        painel.innerHTML = itens.length
          ? `<div class="pill-list">${itens
              .map((s) => `<span class="pill pill-species" style="--sp:${speciesColor(s.name)}">${escapar(s.name)}</span>`)
              .join("")}</div>`
          : `<span class="value">Sem espécies listadas.</span>`;
      }
    } catch (_) {
      painel.innerHTML = `<span class="value">Não foi possível carregar.</span>`;
      carregadas.delete(chave);
    }
  }

  /* ---------- Pinta um filme ---------- */
  function mostrar(f) {
    pedido += 1;
    atual = f;
    const romanoTxt = romanoDe(f.episode_id);

    modal.setAttribute("aria-label", `Detalhes de ${f.title}`);
    roman.textContent = romanoTxt;
    titulo.textContent = f.title;
    modal.style.setProperty("--f1", posterDe(f.episode_id).f1);
    modal.style.setProperty("--f2", posterDe(f.episode_id).f2);

    const ano = anoDoEpisodio(f.episode_id);
    pills.innerHTML = [
      dataBR(f.release_date),
      `Dir. ${f.director}`,
      `Prod. ${f.producer}`,
      ano === null ? null : `Saga: ${ano === 0 ? "0 (Batalha de Yavin)" : Math.abs(ano) + (ano < 0 ? "BBY" : "ABY")}`,
    ]
      .filter(Boolean)
      .map((t) => `<span class="pill">${escapar(t)}</span>`)
      .join("");

    /* Fundo do cabeçalho: o pôster oficial via TMDB, quando houver.
       É puro enfeite — até responder (e se não responder) o cabeçalho fica
       com o visual de sempre. O `pedido` evita que uma resposta atrasada
       pinte o pôster do filme anterior depois de navegar com as setas. */
    const meuPedido = pedido;
    cabecalho.classList.remove("tem-poster");
    fundoCabecalho.style.backgroundImage = "";
    posterDoTmdb(f.title, String(f.release_date || "").slice(0, 4)).then((url) => {
      if (!url || meuPedido !== pedido) return;
      fundoCabecalho.style.backgroundImage = `url("${url}")`;
      cabecalho.classList.add("tem-poster");
    });

    /* O card do crawl reproduz o do filme, e por isso fica em inglês inteiro:
       "Episode IV" + o título como a API devolve. Colar "Episódio" num título
       inglês misturava as duas línguas na mesma linha. O resto da tela (abas,
       botões, pílulas) segue em português. */
    backdrop.querySelector(".crawl-ep").textContent = `Episode ${romanoTxt}`;
    backdrop.querySelector(".crawl-name").textContent = f.title;
    backdrop.querySelector(".crawl-flash-ep").textContent = `Episode ${romanoTxt}`;
    backdrop.querySelector(".crawl-flash-name").textContent = f.title;
    /* O texto integral, sempre. Ele fica dentro de .film-crawl (que é o
       bloco animado) num parágrafo próprio, para o título do episódio subir
       junto sem se misturar ao conteúdo do crawl. */
    crawlEl.textContent = f.opening_crawl;

    /* a cada filme as abas voltam a ser carregadas sob demanda */
    paineis.forEach((p, id) => { if (id !== "crawl") p.innerHTML = ""; });
    trocarAba("crawl");
    reiniciarCrawl();
  }

  mostrar(film);           /* já chama reiniciarCrawl(), que arma a sequência */

  return voar(false);
}
