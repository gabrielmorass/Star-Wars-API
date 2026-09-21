import { estadoVazio } from "../../core/dom.js";
import { setIntent, takeIntent } from "../../core/nav-intent.js";
import { getPlanetName } from "../../core/api.js";
import {
  CLASSIFICACAO,
  CORES,
  DESIGNACAO,
  VAZIO,
  normalizarLingua,
  traduzir,
} from "../../core/vocabulario.js";
import { getPeopleMap, getPortraits } from "../people/api.js";
import { miniAvatar } from "../people/avatar.js";
import { NOME_GLIFO, corHex, glifoDe, svgGlifo } from "./glifos.js";

/* ---------------- Espécies ----------------
   Uma ficha de espécime: a lista é uma grade de cards com o glifo da
   classificação e uma faixa com as cores da espécie; o detalhe é um painel
   grudado com réguas de altura e longevidade (sempre contra a referência
   humana), a paleta de cores como amostras, o planeta natal, os membros
   conhecidos e as aparições — os três últimos levam à view correspondente.

   Contrato intocável desta view, que os testes afirmam:
     #species-search, #species-grid .info-card, #species-detail (com o nome
     do planeta natal quando há espécie selecionada) e a mensagem
     "Nenhuma espécie encontrada.". */

const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const VAZIO_PAINEL = "Selecione uma espécie para ver detalhes.";

/* Referências humanas das réguas. A altura é linear até 3 m (a Hutt, com
   300 cm, é o teto da base). A longevidade é em log: de 70 a 1.000 anos
   numa régua linear, tudo entre 70 e 120 (a maioria) virava um borrão. */
const ALTURA_MAX_CM = 300;
const HUMANO_CM = 180;
const VIDA_MIN = 50;
const VIDA_MAX = 1000;
const HUMANO_ANOS = 120;

const ROMANO = ["", "I", "II", "III", "IV", "V", "VI"];

function escapar(texto) {
  return String(texto).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

/* "180" → 180; "unknown", "n/a", "indefinite" → null */
function numero(valor) {
  const bruto = String(valor ?? "").trim().toLowerCase();
  if (!bruto || VAZIO.has(bruto)) return null;
  const n = Number(bruto.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const ehIndefinida = (valor) => String(valor).trim().toLowerCase() === "indefinite";

function metrosTexto(cm) {
  return `${(cm / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
}

function vidaTexto(valor) {
  if (ehIndefinida(valor)) return "indefinida";
  const n = numero(valor);
  return n === null ? "desconhecida" : `${n.toLocaleString("pt-BR")} anos`;
}

const clamp = (x) => Math.max(0, Math.min(1, x));
const fracaoAltura = (cm) => clamp(cm / ALTURA_MAX_CM);
const fracaoVida = (anos) =>
  clamp((Math.log10(anos) - Math.log10(VIDA_MIN)) / (Math.log10(VIDA_MAX) - Math.log10(VIDA_MIN)));

/* Uma cor da API vira { nome traduzido, valor CSS ou null }. O campo vem
   como lista ("blonde, brown, black"); "n/a"/"none"/"unknown" viram só
   texto, sem amostra. */
function cores(valor) {
  const bruto = String(valor ?? "").trim();
  if (!bruto || VAZIO.has(bruto.toLowerCase())) {
    return [{ nome: traduzir(bruto, CORES), hex: null }];
  }
  return bruto
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ nome: traduzir(p, CORES), hex: corHex(p) }));
}

/* Faixa de cores do card: pele, cabelo e olhos, sem repetir, até 10 */
function faixaDeCores(sp) {
  const vistas = new Set();
  const hexes = [];
  for (const campo of ["skin_colors", "hair_colors", "eye_colors"]) {
    for (const c of cores(sp[campo])) {
      if (c.hex && !vistas.has(c.hex)) {
        vistas.add(c.hex);
        hexes.push(c.hex);
      }
    }
  }
  return hexes.slice(0, 10);
}

const temLingua = (sp) => !VAZIO.has(String(sp.language ?? "").trim().toLowerCase());

/* "mamífero · Shyriiwook"; sem idioma na base fica só a classificação — a
   pill "desconhecida" solta ao lado do glifo não dizia de quê era. */
function metaDoCard(sp) {
  const classe = escapar(traduzir(sp.classification, CLASSIFICACAO));
  return temLingua(sp) ? `${classe} · ${escapar(normalizarLingua(sp.language))}` : classe;
}

/* Tom do glifo: a primeira cor de pele com amostra, clareada para não sumir
   no fundo escuro (pele "black" ou "dark" a 100% desapareceria). */
function tomDoGlifo(sp) {
  const primeira = cores(sp.skin_colors).find((c) => c.hex);
  return primeira ? `color-mix(in srgb, ${primeira.hex} 72%, #ffffff)` : "var(--accent)";
}

/* ---------------- Peças do painel ---------------- */

function regua({ rotulo, texto, fracao, referencia, marcas }) {
  if (fracao === null) {
    return `
      <div class="sp-regua sp-regua--sem">
        <div class="sp-regua-cab"><span>${rotulo}</span><b>${texto}</b></div>
      </div>`;
  }
  return `
    <div class="sp-regua">
      <div class="sp-regua-cab"><span>${rotulo}</span><b>${texto}</b></div>
      <div class="sp-regua-barra">
        <i class="sp-regua-val" style="--w:${(fracao * 100).toFixed(1)}%"></i>
        <i class="sp-regua-ref" style="left:${(referencia.fracao * 100).toFixed(1)}%" title="${referencia.titulo}">
          <em>humano</em>
        </i>
      </div>
      <div class="sp-regua-esc">
        ${marcas.map((m) => `<span style="left:${(m.fracao * 100).toFixed(1)}%">${m.texto}</span>`).join("")}
      </div>
    </div>`;
}

function reguaAltura(sp) {
  const cm = numero(sp.average_height);
  return regua({
    rotulo: "Altura média",
    texto: cm === null ? "desconhecida" : metrosTexto(cm),
    fracao: cm === null ? null : fracaoAltura(cm),
    referencia: { fracao: fracaoAltura(HUMANO_CM), titulo: `Humano: ${metrosTexto(HUMANO_CM)}` },
    marcas: [0, 100, 200, 300].map((v) => ({ fracao: fracaoAltura(v), texto: v === 0 ? "0" : `${v / 100} m` })),
  });
}

function reguaVida(sp) {
  const indef = ehIndefinida(sp.average_lifespan);
  const anos = numero(sp.average_lifespan);
  return regua({
    rotulo: "Longevidade",
    texto: vidaTexto(sp.average_lifespan),
    /* indefinida (droides) enche a régua: não tem fim mesmo */
    fracao: indef ? 1 : anos === null ? null : fracaoVida(anos),
    referencia: { fracao: fracaoVida(HUMANO_ANOS), titulo: `Humano: ${HUMANO_ANOS} anos` },
    marcas: [50, 100, 200, 500, 1000].map((v) => ({
      fracao: fracaoVida(v),
      texto: v.toLocaleString("pt-BR"),
    })),
  });
}

function linhaDeCores(rotulo, valor) {
  const itens = cores(valor)
    .map((c) =>
      c.hex
        ? `<span class="sp-cor"><i style="background:${c.hex}"></i>${escapar(c.nome)}</span>`
        : `<span class="sp-cor sp-cor--sem">${escapar(c.nome)}</span>`
    )
    .join("");
  return `
    <div class="sp-cor-linha">
      <span class="sp-cor-rot">${rotulo}</span>
      <span class="sp-cores">${itens}</span>
    </div>`;
}

/* ---------------- View ---------------- */

export function renderSpeciesView(container, species, navigate) {
  let searchTerm = "";
  let classeFiltro = "";
  let ordem = "name";
  let selecionado = null;
  let visiveis = [];

  container.innerHTML = `
    <div class="sp-layout">
      <div class="sp-topo">
        <div class="people-toolbar sp-bar">
          <input type="search" id="species-search" placeholder="Buscar espécie por nome…" aria-label="Buscar espécie" />
          <label class="sp-ordem">
            <span>Ordenar</span>
            <select id="sp-sort" aria-label="Ordenar espécies">
              <option value="name">Nome</option>
              <option value="average_height">Altura</option>
              <option value="average_lifespan">Longevidade</option>
            </select>
          </label>
        </div>
        <div class="filter-pills sp-classes" role="group" aria-label="Filtrar por classificação"></div>
      </div>
      <div class="card-grid" id="species-grid"></div>
      <div class="detail-panel" id="species-detail">
        <p class="state-msg">${VAZIO_PAINEL}</p>
      </div>
    </div>
  `;

  const grid = container.querySelector("#species-grid");
  const detail = container.querySelector("#species-detail");
  const searchInput = container.querySelector("#species-search");
  const selectOrdem = container.querySelector("#sp-sort");
  const barraClasses = container.querySelector(".sp-classes");

  const itemDoCard = new WeakMap();

  /* ---------------- Filtro de classificação ----------------
     Dez grafias da API viram oito pills, cada uma com o glifo e a contagem. */
  function montarClasses() {
    const contagem = new Map();
    for (const sp of species) {
      const chave = glifoDe(sp.classification);
      contagem.set(chave, (contagem.get(chave) || 0) + 1);
    }
    const ordenadas = [...contagem.entries()].sort((a, b) => b[1] - a[1]);

    barraClasses.innerHTML =
      `<button class="filter-pill${classeFiltro === "" ? " is-on" : ""}" type="button" data-classe="">Todas</button>` +
      ordenadas
        .map(
          ([chave, n]) => `
        <button class="filter-pill sp-pill${classeFiltro === chave ? " is-on" : ""}" type="button" data-classe="${chave}">
          ${svgGlifo(chave, 16)}${NOME_GLIFO[chave]} <i>${n}</i>
        </button>`
        )
        .join("");
  }

  barraClasses.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-classe]");
    if (!btn) return;
    classeFiltro = btn.dataset.classe;
    barraClasses.querySelectorAll("[data-classe]").forEach((b) =>
      b.classList.toggle("is-on", b === btn)
    );
    paintGrid({ comFlip: true });
  });

  /* ---------------- Lista ---------------- */
  const porNome = (a, b) => a.name.localeCompare(b.name, "pt-BR");

  /* numérica decrescente; "indefinite" (droides) vale infinito na
     longevidade; desconhecido vai para o fim */
  function porCampo(campo) {
    const valor = (sp) => {
      if (campo === "average_lifespan" && ehIndefinida(sp[campo])) return Infinity;
      return numero(sp[campo]);
    };
    return (a, b) => {
      const x = valor(a);
      const y = valor(b);
      if (x === null && y === null) return porNome(a, b);
      if (x === null) return 1;
      if (y === null) return -1;
      return y - x || porNome(a, b);
    };
  }

  function filtrar() {
    return species
      .filter((sp) => sp.name.toLowerCase().includes(searchTerm))
      .filter((sp) => !classeFiltro || glifoDe(sp.classification) === classeFiltro)
      .sort(ordem === "name" ? porNome : porCampo(ordem));
  }

  function cardHTML(sp, i) {
    const chave = glifoDe(sp.classification);
    const faixa = faixaDeCores(sp);
    return `
      <button class="info-card sp-card${selecionado === sp ? " is-sel" : ""}"
              data-index="${i}" type="button" aria-pressed="${selecionado === sp}">
        <span class="sp-glifo" style="color:${tomDoGlifo(sp)}" aria-hidden="true">${svgGlifo(chave, 34)}</span>
        <span class="sp-txt">
          <h3>${escapar(sp.name)}</h3>
          <p class="meta">${metaDoCard(sp)}</p>
        </span>
        ${
          faixa.length
            ? `<span class="sp-dna" aria-hidden="true">${faixa.map((h) => `<i style="background:${h}"></i>`).join("")}</span>`
            : `<span class="sp-dna sp-dna--vazia" aria-hidden="true"></span>`
        }
      </button>`;
  }

  function paintGrid({ comFlip = false } = {}) {
    const antes = comFlip
      ? new Map([...grid.querySelectorAll(".sp-card")].map((el) => [itemDoCard.get(el), el.getBoundingClientRect()]))
      : null;

    visiveis = filtrar();

    grid.innerHTML = visiveis.length
      ? visiveis.map(cardHTML).join("")
      : estadoVazio("Nenhuma espécie encontrada.");

    grid.querySelectorAll(".sp-card").forEach((el, i) => {
      itemDoCard.set(el, visiveis[i]);
      el.addEventListener("click", () => selectSpecies(visiveis[i]));
    });

    if (antes && !REDUCE) tocarFlip(antes);
  }

  /* FLIP: os cards já estão na posição final; medimos de onde vieram e
     animamos a diferença. Card novo só aparece. */
  function tocarFlip(antes) {
    grid.querySelectorAll(".sp-card").forEach((el) => {
      const de = antes.get(itemDoCard.get(el));
      if (!de || !el.animate) return;
      const para = el.getBoundingClientRect();
      const dx = de.left - para.left;
      const dy = de.top - para.top;
      if (!dx && !dy) return;
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        { duration: 250, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
      );
    });
  }

  /* ---------------- Painel ---------------- */
  function selectSpecies(sp) {
    if (!sp) return;
    selecionado = sp;
    pintarDetalhe();
    grid.querySelectorAll(".sp-card").forEach((el) => {
      const on = itemDoCard.get(el) === sp;
      el.classList.toggle("is-sel", on);
      el.setAttribute("aria-pressed", String(on));
    });
  }

  function pintarDetalhe() {
    const sp = selecionado;
    if (!sp) {
      detail.innerHTML = `<p class="state-msg">${VAZIO_PAINEL}</p>`;
      return;
    }
    const chave = glifoDe(sp.classification);

    detail.innerHTML = `
      <div class="sp-head">
        <span class="sp-head-glifo" style="color:${tomDoGlifo(sp)}" aria-hidden="true">${svgGlifo(chave, 96, "sil--desenha")}</span>
        <div class="sp-head-txt">
          <h3>${escapar(sp.name)}</h3>
          <div class="fm-pills sp-head-pills">
            <span class="pill">${escapar(traduzir(sp.classification, CLASSIFICACAO))}</span>
            <span class="pill">${escapar(traduzir(sp.designation, DESIGNACAO))}</span>
            ${temLingua(sp) ? `<span class="pill">${escapar(normalizarLingua(sp.language))}</span>` : ""}
          </div>
        </div>
      </div>

      <div class="sp-secao">
        <h4>Fisiologia <span class="sp-secao-nota">contra a referência humana</span></h4>
        ${reguaAltura(sp)}
        ${reguaVida(sp)}
      </div>

      <div class="sp-secao">
        <h4>Cores</h4>
        ${linhaDeCores("Pele", sp.skin_colors)}
        ${linhaDeCores("Cabelo", sp.hair_colors)}
        ${linhaDeCores("Olhos", sp.eye_colors)}
      </div>

      <div class="sp-secao sp-origem">
        <h4>Planeta natal</h4>
        <p class="sp-planeta-carregando">Buscando…</p>
      </div>

      <div class="sp-secao sp-membros"></div>
      <div class="sp-secao sp-filmes"></div>
    `;

    ligarReguas();
    carregarPlaneta(sp);
    carregarMembros(sp);
    carregarFilmes(sp);
  }

  /* As barras nascem em zero e recebem a largura no quadro seguinte, para a
     transição do CSS ter de onde sair. */
  function ligarReguas() {
    const barras = detail.querySelectorAll(".sp-regua-val");
    if (REDUCE) {
      barras.forEach((b) => b.classList.add("is-on"));
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => barras.forEach((b) => b.classList.add("is-on")));
    });
  }

  /* ---------------- Planeta natal ----------------
     A espécie traz só a url do planeta; o nome é resolvido uma vez por url
     e memorizado. Droides e algumas espécies vêm sem planeta. */
  const nomeDoPlaneta = new Map();

  async function carregarPlaneta(sp) {
    const caixa = detail.querySelector(".sp-origem");
    if (!caixa) return;

    if (!sp.homeworld) {
      caixa.innerHTML = `<h4>Planeta natal</h4><p class="sp-vazio">Sem planeta natal registrado na base.</p>`;
      return;
    }

    if (!nomeDoPlaneta.has(sp.homeworld)) {
      nomeDoPlaneta.set(sp.homeworld, getPlanetName(sp.homeworld));
    }
    const nome = await nomeDoPlaneta.get(sp.homeworld);
    if (selecionado !== sp) return;

    caixa.innerHTML = `<h4>Planeta natal</h4>`;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pill pill-link sp-planeta";
    b.setAttribute("aria-label", `Ver ${nome} no Sistema planetário`);
    b.innerHTML = `<i class="sp-planeta-orbe" aria-hidden="true"></i>`;
    b.appendChild(document.createTextNode(nome));
    b.addEventListener("click", () => {
      if (!navigate) return;
      setIntent("planets", { name: nome });
      navigate("planets");
    });
    caixa.appendChild(b);
  }

  /* ---------------- Membros ----------------
     A lista `people` da espécie na SWAPI é parcial (Human traz 4 nomes,
     mas 35 personagens são humanos — a API deixa `species` vazio neles,
     ver README). Por isso os membros são derivados da lista de personagens:
     todo mundo que aponta para esta espécie, mais os de `species` vazio
     quando a espécie é Human. */
  async function carregarMembros(sp) {
    const caixa = detail.querySelector(".sp-membros");
    if (!caixa) return;
    caixa.innerHTML = `<h4>Membros conhecidos</h4><div class="sp-gente"><span class="fm-skel fm-skel--cast"></span></div>`;

    const [mapa, retratos] = await Promise.all([
      getPeopleMap().catch(() => new Map()),
      getPortraits().catch(() => new Map()),
    ]);
    if (selecionado !== sp) return;

    const listados = new Set(sp.people || []);
    const gente = [...mapa.values()]
      .filter(
        (p) =>
          listados.has(p.url) ||
          (p.species || []).includes(sp.url) ||
          (sp.name === "Human" && (!p.species || p.species.length === 0))
      )
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    if (!gente.length) {
      caixa.innerHTML = `<h4>Membros conhecidos</h4><p class="sp-vazio">Nenhum personagem desta espécie na base.</p>`;
      return;
    }

    const alvo = document.createElement("div");
    alvo.className = "sp-gente";
    gente.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sp-membro";
      b.setAttribute("aria-label", `Ver ${p.name} em Personagens`);
      b.appendChild(miniAvatar(p, 48, retratos));
      const nome = document.createElement("span");
      nome.textContent = p.name;
      b.appendChild(nome);
      b.addEventListener("click", () => {
        if (!navigate) return;
        setIntent("people", { name: p.name });
        navigate("people");
      });
      alvo.appendChild(b);
    });

    caixa.innerHTML = `<h4>Membros conhecidos <i class="sp-conta">${gente.length}</i></h4>`;
    caixa.appendChild(alvo);
  }

  function carregarFilmes(sp) {
    const caixa = detail.querySelector(".sp-filmes");
    if (!caixa) return;
    const ids = (sp.films || [])
      .map((u) => Number(String(u).match(/films\/(\d+)/)?.[1]))
      .filter(Boolean)
      .sort((a, b) => a - b);

    if (!ids.length) {
      caixa.remove();
      return;
    }

    caixa.innerHTML =
      `<h4>Aparições</h4><div class="sp-pills">` +
      ids
        .map((id) => `<button class="pill sp-filme" type="button" data-film="${id}">Episódio ${ROMANO[id] || id}</button>`)
        .join("") +
      `</div>`;

    caixa.querySelectorAll("[data-film]").forEach((b) => {
      b.addEventListener("click", () => {
        if (!navigate) return;
        setIntent("films", { episode: Number(b.dataset.film) });
        navigate("films");
      });
    });
  }

  /* ---------------- Busca e ordenação ---------------- */
  searchInput.addEventListener("input", (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    paintGrid();
  });

  selectOrdem.addEventListener("change", (e) => {
    ordem = e.target.value;
    paintGrid({ comFlip: true });
  });

  montarClasses();
  paintGrid();

  /* Outra view pode pedir uma espécie já aberta. Sem intenção, nada muda. */
  const intent = takeIntent("species");
  if (intent && intent.name) {
    const alvo = species.find((sp) => sp.name === intent.name);
    if (alvo) {
      selectSpecies(alvo);
      detail.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }
}
