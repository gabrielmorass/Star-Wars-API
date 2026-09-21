import {
  getPortraits,
  getPersonSpecies,
  getSpeciesMap,
  getFilmsMap,
  getCraftMap,
  speciesNameOf,
} from "./api.js";
import { getPlanetName } from "../../core/api.js";
import { setIntent, takeIntent } from "../../core/nav-intent.js";
import { ANOS_FILMES } from "../../core/saga.js";
import { CORES, GENERO, VAZIO, legivel, traduzir } from "../../core/vocabulario.js";
import { createPlanetView } from "../planets/planet-art.js";
import { subscribe, unsubscribe } from "../../fx/loop.js";
import {
  initials,
  avatarStyle,
  carregarFoto,
  resolverFoto,
  miniAvatar,
  speciesColor,
  OTHER_SPECIES_COLOR,
} from "./avatar.js";

/* ---------------- Personagens ----------------
   A grade é uma lista de botões `.person-card`; a busca, os filtros de
   espécie e o filtro de filme se combinam num único `applyFilter()`.

   Espécie, filmes e naves vêm de três mapas memorizados (js/features/
   people/api.js): uma requisição cada, e não uma por card. */

/* Os dicionários e o `traduzir` moram em core/vocabulario.js, compartilhados
   com Planetas e Espécies — ver o comentário de abertura de lá para a regra
   de o que traduz e o que fica em inglês. */

/* Números da SWAPI vêm como texto ("1358"); aqui viram 1.358 */
function numero(valor, sufixo) {
  const v = String(valor ?? "").trim();
  if (VAZIO.has(v.toLowerCase())) return "desconhecido";
  const n = Number(v.replace(/[.,]/g, ""));
  if (!Number.isFinite(n)) return v;
  return `${n.toLocaleString("pt-BR")} ${sufixo}`;
}

const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const PONTEIRO_FINO = window.matchMedia("(pointer: fine)").matches;

/* ---------------- Cronologia ----------------
   Eixo em anos relativos à Batalha de Yavin: negativo antes (BBY),
   positivo depois (ABY). A SWAPI dá o nascimento como texto ("19BBY"). */

/* Extremos do eixo. 900BBY porque Yoda nasce em 896BBY; 10ABY porque o
   nascimento mais recente da SWAPI é 8BBY (Wicket) e o eixo precisa de uma
   folga depois da Batalha de Yavin para os Episódios V e VI caberem. */
const ANO_MIN = -900;
const ANO_MAX = 10;

function anoDe(pessoa) {
  const m = /^\s*([\d.]+)\s*(BBY|ABY)\s*$/i.exec(String(pessoa.birth_year || ""));
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  return /BBY/i.test(m[2]) ? -n : n;
}

function rotuloAno(ano) {
  if (ano === 0) return "0 (Batalha de Yavin)";
  return ano < 0 ? `${Math.abs(ano)}BBY` : `${ano}ABY`;
}


/* Altura e massa como número, ou null quando a SWAPI não sabe */
function numeroCru(valor) {
  const v = String(valor ?? "").trim();
  if (VAZIO.has(v.toLowerCase())) return null;
  const n = Number(v.replace(/[.,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function renderPeopleView(container, people, onOpenPerson, navigate) {
  container.innerHTML = `
    <div class="people-view">
      <div class="people-toolbar people-bar">
        <input type="search" id="people-search" placeholder="Buscar personagem por nome…" aria-label="Buscar personagem" />
        <div class="filter-pills" role="group" aria-label="Filtrar por espécie">
          <button class="filter-pill is-on" type="button" data-filter="all">Todos</button>
          <button class="filter-pill" type="button" data-filter="human">Humanos</button>
          <button class="filter-pill" type="button" data-filter="droid">Droides</button>
          <button class="filter-pill" type="button" data-filter="other">Outras espécies</button>
        </div>
        <label class="film-filter">
          <span>Aparece em:</span>
          <select id="people-film" aria-label="Filtrar por filme">
            <option value="">Todos os filmes</option>
          </select>
        </label>
        <label class="film-filter">
          <span>Ordenar:</span>
          <select id="people-sort" aria-label="Ordenar personagens">
            <option value="name">Nome A-Z</option>
            <option value="height">Altura</option>
            <option value="birth">Nascimento</option>
          </select>
        </label>
        <div class="filter-pills view-switch" role="group" aria-label="Modo de exibição">
          <button class="filter-pill is-on" type="button" data-mode="grid">Grade</button>
          <button class="filter-pill" type="button" data-mode="timeline">Linha do tempo</button>
        </div>
        <p class="people-count" aria-live="polite"></p>
      </div>
      <div class="people-grid" id="people-grid"><p class="state-msg">Carregando fotos…</p></div>
      <div class="people-timeline" hidden></div>
    </div>
  `;

  const grid = container.querySelector("#people-grid");
  const searchInput = container.querySelector("#people-search");
  const filterPills = [...container.querySelectorAll("[data-filter]")];
  const filmSelect = container.querySelector("#people-film");
  const counter = container.querySelector(".people-count");
  const sortSelect = container.querySelector("#people-sort");
  const modeButtons = [...container.querySelectorAll("[data-mode]")];
  const timeline = container.querySelector(".people-timeline");

  let speciesFilter = "all";
  let filmFilter = "";
  let sortBy = "name";
  let mode = "grid";
  let visible = people;
  let firstPaint = true;
  let speciesMap = new Map();

  /* que pessoa está em cada card — sobrevive à reordenação por FLIP, que
     move os nós sem recriá-los */
  const pessoaDoCard = new WeakMap();

  const portraits = await getPortraits();

  /* ---------- Espécie sob demanda ----------
     O observador é quem decide QUANDO a pílula é preenchida: card fora da
     tela não escreve nada. A consulta em si é síncrona, num mapa já
     carregado — por isso a pílula nasce com "…" e troca assim que o mapa
     chega ou o card entra em cena. */
  const speciesObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver((entries, obs) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            fillSpecies(entry.target);
            carregarRetrato(entry.target);
            obs.unobserve(entry.target);
          }
        }, { rootMargin: "200px" })
      : null;

  function fillSpecies(card) {
    const person = visible[Number(card.dataset.index)];
    if (!person) return;
    const pill = card.querySelector(".person-species");
    if (!pill || !speciesMap.size) return;
    const nome = speciesNameOf(person, speciesMap);
    pill.textContent = nome;
    card.style.setProperty("--sp", speciesColor(nome));
  }

  /* O retrato só é pedido quando o card entra em cena — daí ter saído o
     loading="lazy", que adiava o pedido para fora do prazo do timeout. */
  function carregarRetrato(card) {
    const person = visible[Number(card.dataset.index)];
    if (!person || card.dataset.foto === "1") return;
    card.dataset.foto = "1";
    carregarFoto(
      card.querySelector(".person-photo-wrap"),
      portraits.get(person.name.trim().toLowerCase())
    );
  }

  function fillAllVisible() {
    grid.querySelectorAll(".person-card").forEach(fillSpecies);
  }

  getSpeciesMap().then((map) => {
    speciesMap = map;
    fillAllVisible();
  });

  getFilmsMap().then((map) => {
    const ordenados = [...map.entries()].sort((a, b) => a[1].episode - b[1].episode);
    for (const [url, f] of ordenados) {
      const opt = document.createElement("option");
      opt.value = url;
      opt.textContent = `Ep. ${f.episode} — ${f.title}`;
      filmSelect.appendChild(opt);
    }
  });

  /* Na grade o contador conta cards; na linha do tempo só quem tem ano cabe
     no eixo, então ele separa as duas coisas em vez de anunciar um total que
     não corresponde ao que está desenhado. */
  function atualizarContador() {
    if (mode === "timeline") {
      const comAno = visible.filter((p) => anoDe(p) !== null).length;
      const semAno = visible.length - comAno;
      counter.textContent = `${comAno} com ano · ${semAno} desconhecido${semAno === 1 ? "" : "s"}`;
      return;
    }
    if (visible.length === 0) { counter.textContent = "Nenhum personagem"; return; }
    counter.textContent =
      visible.length === 1 ? "1 personagem" : `${visible.length} personagens`;
  }

  /* ---------- Grade ---------- */
  function paint(list) {
    visible = list;

    if (list.length === 0) {
      grid.innerHTML = `<p class="state-msg">Nenhum personagem encontrado.</p>`;
      atualizarContador();
      return;
    }

    atualizarContador();

    grid.innerHTML = list
      .map((p, i) => {
        const nasc = p.birth_year === "unknown" ? "Nasc. desconhecido" : p.birth_year;
        const cor = speciesMap.size ? speciesColor(speciesNameOf(p, speciesMap)) : OTHER_SPECIES_COLOR;
        const especie = speciesMap.size ? speciesNameOf(p, speciesMap) : "…";
        return `
        <button class="person-card" data-index="${i}" type="button"
                style="--sp:${cor}; --i:${Math.min(i, 24)}">
          <div class="person-photo-wrap">
            <span class="person-avatar-fallback" style="${avatarStyle(p.name)}">${initials(p.name)}</span>
          </div>
          <p class="name">${p.name}</p>
          <span class="person-species">${especie}</span>
          <p class="meta">${nasc}</p>
        </button>`;
      })
      .join("");

    if (firstPaint && !REDUCE) {
      grid.classList.add("is-entering");
      setTimeout(() => grid.classList.remove("is-entering"), 900);
    }
    firstPaint = false;


    grid.querySelectorAll(".person-card").forEach((el, i) => {
      pessoaDoCard.set(el, list[i]);
      el.addEventListener("click", () => abrir(pessoaDoCard.get(el), el));
      if (speciesObserver) {
        speciesObserver.observe(el);
      } else {
        fillSpecies(el);
        carregarRetrato(el);
      }
    });
  }

  /* Abrir o modal a partir de qualquer lugar (card ou linha do tempo) */
  function abrir(pessoa, origemEl) {
    const i = visible.indexOf(pessoa);
    onOpenPerson(pessoa, {
      list: visible,
      index: i < 0 ? 0 : i,
      cardEl: origemEl || null,
      navigate,
      speciesMap,
      all: people,
      portraits,
      filtrarPorEspecie,
    });
  }

  /* O chip "+N outros" do modal volta para a grade já filtrada. Em vez de
     repetir a lógica de filtro, dispara a própria pílula da barra — o
     estado visual dela e a contagem acompanham de graça. */
  function filtrarPorEspecie(chave) {
    const pill = filterPills.find((b) => b.dataset.filter === chave);
    if (!pill) return;
    if (mode !== "grid") trocarModo("grid");
    /* o chip promete "todos os outros": um termo de busca ainda ativo
       devolveria o mesmo punhado de gente que já estava no modal */
    searchInput.value = "";
    pill.click();
    container.querySelector(".people-view")?.scrollIntoView({ block: "start" });
  }

  /* ---------- Ordenação com FLIP ----------
     Reordena os nós existentes e anima o deslocamento, em vez de refazer a
     grade: as fotos já carregadas continuam onde estão. */
  const COMPARADORES = {
    name: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
    height: (a, b) => {
      const ha = numeroCru(a.height);
      const hb = numeroCru(b.height);
      if (ha === null) return hb === null ? 0 : 1;   /* desconhecido por último */
      if (hb === null) return -1;
      return hb - ha;
    },
    birth: (a, b) => {
      const aa = anoDe(a);
      const ab = anoDe(b);
      if (aa === null) return ab === null ? 0 : 1;
      if (ab === null) return -1;
      return aa - ab;                                 /* mais velho primeiro */
    },
  };

  function ordenarComFlip() {
    const cards = [...grid.querySelectorAll(".person-card")];
    if (cards.length < 2) return;

    const antes = new Map(cards.map((el) => [el, el.getBoundingClientRect()]));

    visible = [...visible].sort(COMPARADORES[sortBy] || COMPARADORES.name);
    const ordem = new Map(visible.map((p, i) => [p, i]));
    cards
      .slice()
      .sort((a, b) => ordem.get(pessoaDoCard.get(a)) - ordem.get(pessoaDoCard.get(b)))
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
        { duration: 200, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
      );
    }
  }

  /* ---------- Efeito magnético ----------
     Cards a menos de 120px do cursor inclinam até 4° na direção dele. Roda
     no laço único (js/fx/loop.js) e se desinscreve quando tudo assenta. */
  const ALCANCE = 120;
  const GRAU_MAX = 4;

  if (!REDUCE && PONTEIRO_FINO) {
    const estado = new Map();     /* card -> { rx, ry, alvoX, alvoY } */
    let cursor = null;
    let inscrito = false;

    const lerp = (a, b, k) => a + (b - a) * k;

    const passo = () => {
      let vivo = false;
      for (const [el, st] of estado) {
        st.rx = lerp(st.rx, st.alvoX, 0.18);
        st.ry = lerp(st.ry, st.alvoY, 0.18);
        if (Math.abs(st.rx) < 0.02 && Math.abs(st.ry) < 0.02 &&
            !st.alvoX && !st.alvoY) {
          el.style.transform = "";
          estado.delete(el);
          continue;
        }
        vivo = true;
        el.style.transform =
          `perspective(700px) rotateX(${st.rx.toFixed(2)}deg) rotateY(${st.ry.toFixed(2)}deg)`;
      }
      if (!vivo) {
        unsubscribe(passo);
        inscrito = false;
      }
    };

    const acordar = () => {
      if (inscrito) return;
      subscribe(passo);
      inscrito = true;
    };

    grid.addEventListener("pointermove", (e) => {
      cursor = { x: e.clientX, y: e.clientY };
      for (const el of grid.querySelectorAll(".person-card")) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = cursor.x - cx;
        const dy = cursor.y - cy;
        /* distância até a borda do card, não até o centro */
        const fora = Math.hypot(
          Math.max(0, Math.abs(dx) - r.width / 2),
          Math.max(0, Math.abs(dy) - r.height / 2)
        );
        const st = estado.get(el) || { rx: 0, ry: 0, alvoX: 0, alvoY: 0 };
        if (fora <= ALCANCE) {
          const forca = 1 - fora / ALCANCE;
          st.alvoY = Math.max(-GRAU_MAX, Math.min(GRAU_MAX, (dx / (r.width / 2)) * GRAU_MAX * forca));
          st.alvoX = Math.max(-GRAU_MAX, Math.min(GRAU_MAX, (-dy / (r.height / 2)) * GRAU_MAX * forca));
          estado.set(el, st);
        } else if (estado.has(el)) {
          st.alvoX = 0;
          st.alvoY = 0;
        }
      }
      acordar();
    }, { passive: true });

    grid.addEventListener("pointerleave", () => {
      cursor = null;
      for (const st of estado.values()) { st.alvoX = 0; st.alvoY = 0; }
      acordar();
    }, { passive: true });
  }

  /* ---------- Linha do tempo ----------
     Escala por trechos: a saga tem 43 personagens com nascimento conhecido,
     40 deles entre 120BBY e hoje e só três lá atrás (Yoda 896BBY, Jabba
     600BBY, Chewbacca 200BBY). Num eixo linear de 900 anos, esses 40 viravam
     um borrão de 90px no canto direito. Por isso:

       - modo "foco" (o que abre): o eixo É 120BBY..10ABY;
       - modo "tudo": 900BBY..120BBY ocupa 15% da largura e 120BBY..10ABY
         ocupa os outros 85%, com um zigue-zague no ponto da troca.

     Ao colidir, os avatares empilham em coluna — no máximo 6; do sétimo em
     diante viram um círculo "+N" que abre em leque. A altura do quadro é
     fixa (420px) e nada passa disso. */
  const CORTE = -120;
  const FRACAO_COMPRIMIDA = 0.15;
  const ANO_FIM = 10;
  const MAX_PILHA = 6;
  const PASSO_LINHA = 42;
  const COLISAO = 44;
  const TOPO_EIXO = 90;
  /* folga nas duas pontas: sem ela o rótulo do primeiro e do último ano
     nascem metade fora do quadro, porque a marca é centrada no ano */
  const MARGEM_EIXO = 44;
  const TOPO_GENTE = TOPO_EIXO + 24;

  let escopo = "foco";
  let zoomLinha = 1;
  let rolagemInicial = null;

  function marcasEntre(de, ate, passo) {
    const saida = [];
    for (let a = de; a <= ate; a += passo) saida.push(a);
    return saida;
  }

  function escalaDe(larguraEixo) {
    if (escopo === "foco") {
      return {
        x: (ano) => MARGEM_EIXO + ((ano - CORTE) / (ANO_FIM - CORTE)) * larguraEixo,
        marcas: marcasEntre(CORTE, ANO_FIM, 10).map((ano) => ({ ano, antigo: false })),
        quebra: null,
      };
    }
    const comprimido = larguraEixo * FRACAO_COMPRIMIDA;
    return {
      x: (ano) =>
        MARGEM_EIXO +
        (ano <= CORTE
          ? ((ano - ANO_MIN) / (CORTE - ANO_MIN)) * comprimido
          : comprimido + ((ano - CORTE) / (ANO_FIM - CORTE)) * (larguraEixo - comprimido)),
      marcas: [
        ...marcasEntre(ANO_MIN, CORTE - 1, 200).map((ano) => ({ ano, antigo: true })),
        ...marcasEntre(CORTE, ANO_FIM, 10).map((ano) => ({ ano, antigo: false })),
      ],
      quebra: MARGEM_EIXO + comprimido,
    };
  }

  /* Agrupa quem se encosta numa coluna só, ancorada na média dos anos do
     grupo — assim a coluna não fica presa ao x do primeiro que chegou. */
  function agruparEmColunas(postos, x) {
    const colunas = [];
    for (const posto of postos) {
      const px = x(posto.ano);
      const ultima = colunas[colunas.length - 1];
      if (ultima && px - ultima.px < COLISAO) {
        ultima.itens.push(posto);
        ultima.px = (ultima.px * (ultima.itens.length - 1) + px) / ultima.itens.length;
      } else {
        colunas.push({ px, itens: [posto] });
      }
    }
    return colunas;
  }

  function montarLinha() {
    const comAno = visible
      .map((p) => ({ p, ano: anoDe(p) }))
      .filter((x) => x.ano !== null)
      .sort((a, b) => a.ano - b.ano);
    const semAno = visible.filter((p) => anoDe(p) === null);

    const foraDoFoco = escopo === "foco" ? comAno.filter((x) => x.ano < CORTE) : [];
    const noEixo = comAno.filter((x) => escopo !== "foco" || x.ano >= CORTE);

    const base = Math.max(timeline.clientWidth - 320, 760);
    const larguraEixo = base * zoomLinha;
    const escala = escalaDe(larguraEixo);
    const x = escala.x;

    timeline.innerHTML = `
      <div class="tl-head">
        <button class="tl-scope" type="button"></button>
        <span class="tl-hint"></span>
      </div>
      <div class="tl-frame">
        <div class="tl-stage">
          <div class="tl-canvas" style="width:${larguraEixo + MARGEM_EIXO * 2}px">
            <div class="tl-axis"></div>
            <span class="tl-guide" hidden></span>
            <div class="tl-ticks"></div>
            <div class="tl-films"></div>
            <div class="tl-people"></div>
          </div>
        </div>
        <div class="tl-unknown">
          <span class="tl-unknown-label">Desconhecido</span>
          <div class="tl-unknown-people"></div>
        </div>
      </div>
      <span class="tl-tip" role="tooltip" hidden></span>
    `;

    const canvas = timeline.querySelector(".tl-canvas");
    const guia = timeline.querySelector(".tl-guide");
    const pistaFilmes = timeline.querySelector(".tl-films");
    const pistaTicks = timeline.querySelector(".tl-ticks");
    const pistaGente = timeline.querySelector(".tl-people");
    const pistaSem = timeline.querySelector(".tl-unknown-people");
    const botaoEscopo = timeline.querySelector(".tl-scope");
    const balao = timeline.querySelector(".tl-tip");
    const dica = timeline.querySelector(".tl-hint");
    canvas.style.setProperty("--tl-base", `${TOPO_EIXO}px`);

    botaoEscopo.textContent = escopo === "foco" ? "Ver tudo (900BBY)" : "Focar em 120BBY";
    dica.textContent =
      escopo === "foco"
        ? `Eixo de 120BBY a 10ABY · role para os lados · scroll sobre o eixo aproxima (${zoomLinha.toFixed(1)}×)`
        : `900BBY a 120BBY comprimido em 15% do eixo · scroll aproxima (${zoomLinha.toFixed(1)}×)`;
    botaoEscopo.addEventListener("click", () => {
      escopo = escopo === "foco" ? "tudo" : "foco";
      zoomLinha = 1;
      rolagemInicial = 0;
      montarLinha();
    });

    /* marcas do eixo. No trecho comprimido cabem quatro séculos em ~190px:
       os rótulos sobem para cima do eixo e alternam duas alturas, que é o
       que os deixa legíveis sem girar (girado, o texto saía do quadro). */
    let antigoN = 0;
    for (const { ano, antigo } of escala.marcas) {
      const t = document.createElement("span");
      t.className = antigo ? "tl-tick tl-tick--antigo" : "tl-tick";
      if (antigo) t.style.setProperty("--alt2", String(antigoN++ % 2));
      t.style.left = `${x(ano)}px`;
      t.textContent = rotuloAno(ano).replace(" (Batalha de Yavin)", "");
      pistaTicks.appendChild(t);
    }

    /* zigue-zague onde a escala muda */
    if (escala.quebra !== null) {
      const q = document.createElement("span");
      q.className = "tl-break";
      q.style.left = `${escala.quebra}px`;
      q.title = "A escala muda aqui: à esquerda, 780 anos em 15% do eixo";
      q.innerHTML =
        `<svg viewBox="0 0 16 26" aria-hidden="true"><path d="M8 0 L2 7 L14 13 L2 19 L8 26"/></svg>`;
      canvas.appendChild(q);
    }

    /* marcadores dos filmes: rótulo no topo, em duas alturas alternadas */
    ANOS_FILMES.forEach((f, i) => {
      const m = document.createElement("span");
      m.className = "tl-film";
      m.style.left = `${x(f.ano)}px`;
      /* três alturas: Ep. IV, V e VI ficam a 4 anos um do outro e em
         duas alturas os rótulos ainda se encavalavam em 1x */
      m.style.setProperty("--alt", String(i % 3));
      m.innerHTML = `<b>Ep. ${f.romano}</b><i></i>`;
      m.title = `Episódio ${f.romano} — ${rotuloAno(f.ano)}`;
      pistaFilmes.appendChild(m);
    });

    const yavin = document.createElement("span");
    yavin.className = "tl-film tl-film--yavin";
    yavin.style.left = `${x(0)}px`;
    yavin.style.setProperty("--alt", "3");
    yavin.innerHTML = `<b>Batalha de Yavin</b><i></i>`;
    pistaFilmes.appendChild(yavin);

    /* chip dos que ficaram fora do trecho em foco */
    if (foraDoFoco.length) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "tl-older";
      chip.textContent = `◀ ${foraDoFoco.length} ${foraDoFoco.length === 1 ? "nasceu" : "nasceram"} antes de 120BBY`;
      chip.title = foraDoFoco.map((f) => `${f.p.name} (${rotuloAno(f.ano)})`).join(" · ");
      chip.addEventListener("click", () => {
        escopo = "tudo";
        zoomLinha = 1;
        rolagemInicial = 0;
        montarLinha();
      });
      canvas.appendChild(chip);
    }

    /* ---------- Hover: tooltip e destaque do ano ----------
       O tooltip é um elemento só, do painel inteiro, em position: fixed e
       posicionado a partir do getBoundingClientRect do avatar. Antes ele era
       um filho absolute de cada botão; na faixa "Desconhecido" o botão é
       static, então o absolute subia até o bloco-contêiner inicial e o balão
       ia parar no topo da página, por cima da navegação. */
    function mostrarDica(alvo, nome, detalhe) {
      balao.innerHTML = "";
      const n = document.createElement("strong");
      n.textContent = nome;
      const d = document.createElement("em");
      d.textContent = detalhe;
      balao.append(n, d);
      balao.hidden = false;

      const r = alvo.getBoundingClientRect();
      const t = balao.getBoundingClientRect();
      const margem = 8;
      let esq = r.left + r.width / 2 - t.width / 2;
      esq = Math.max(margem, Math.min(esq, window.innerWidth - t.width - margem));
      /* acima do avatar; se não couber, desce para baixo dele */
      let topo = r.top - t.height - 10;
      if (topo < margem) topo = r.bottom + 10;
      balao.style.left = `${Math.round(esq)}px`;
      balao.style.top = `${Math.round(topo)}px`;
    }

    function esconderDica() {
      balao.hidden = true;
      guia.hidden = true;
    }

    /* Destaque do ano: só para quem TEM ano. Sem birth_year válido não há
       posição no eixo, e desenhar a linha mesmo assim punha uma barra no
       zero do eixo sem relação nenhuma com o avatar sob o cursor. */
    function destacarAno(ano) {
      if (ano === null || !Number.isFinite(ano)) { guia.hidden = true; return; }
      guia.hidden = false;
      guia.style.left = `${x(ano)}px`;
    }

    /* avatares: coluna com no máximo 6 e um "+N" em leque para o resto */
    function pinoDe(posto, tamanho) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tl-person";
      btn.setAttribute("aria-label", `${posto.p.name} — ${rotuloAno(posto.ano)}`);
      btn.appendChild(miniAvatar(posto.p, tamanho, portraits));
      const aoEntrar = () => {
        mostrarDica(btn, posto.p.name, rotuloAno(posto.ano));
        destacarAno(posto.ano);
      };
      btn.addEventListener("pointerenter", aoEntrar);
      btn.addEventListener("focus", aoEntrar);
      btn.addEventListener("pointerleave", esconderDica);
      btn.addEventListener("blur", esconderDica);
      btn.addEventListener("click", () => abrir(posto.p, btn));
      return btn;
    }

    for (const coluna of agruparEmColunas(noEixo, x)) {
      const visiveis = coluna.itens.slice(0, MAX_PILHA);
      const escondidos = coluna.itens.slice(MAX_PILHA);

      visiveis.forEach((posto, faixa) => {
        const btn = pinoDe(posto, 40);
        btn.style.left = `${coluna.px}px`;
        btn.style.top = `${TOPO_GENTE + faixa * PASSO_LINHA}px`;
        pistaGente.appendChild(btn);
      });

      if (!escondidos.length) continue;

      /* O leque: os escondidos ficam num arco ACIMA do círculo, que é onde
         sempre cabe — o quadro tem altura fixa e corta o que descer. */
      const grupo = document.createElement("div");
      grupo.className = "tl-fan";
      grupo.style.left = `${coluna.px}px`;
      grupo.style.top = `${TOPO_GENTE + MAX_PILHA * PASSO_LINHA}px`;

      const bolha = document.createElement("button");
      bolha.type = "button";
      bolha.className = "tl-more";
      bolha.textContent = `+${escondidos.length}`;
      bolha.setAttribute("aria-expanded", "false");
      bolha.setAttribute(
        "aria-label",
        `Mais ${escondidos.length}: ${escondidos.map((e) => e.p.name).join(", ")}`
      );
      grupo.appendChild(bolha);

      escondidos.forEach((posto, i) => {
        const btn = pinoDe(posto, 32);
        btn.classList.add("tl-fanned");
        const anel = i < 8 ? 0 : 1;
        const noAnel = anel === 0 ? Math.min(escondidos.length, 8) : escondidos.length - 8;
        const idx = anel === 0 ? i : i - 8;
        const raio = anel === 0 ? 62 : 104;
        const ang = (195 + ((idx + 0.5) / noAnel) * 150) * (Math.PI / 180);
        btn.style.setProperty("--fx", `${(Math.cos(ang) * raio).toFixed(1)}px`);
        btn.style.setProperty("--fy", `${(Math.sin(ang) * raio).toFixed(1)}px`);
        btn.style.setProperty("--fd", `${i * 22}ms`);
        grupo.appendChild(btn);
      });

      const abrirLeque = (sim) => {
        grupo.classList.toggle("is-open", sim);
        bolha.setAttribute("aria-expanded", String(sim));
      };
      bolha.addEventListener("click", () => abrirLeque(!grupo.classList.contains("is-open")));
      grupo.addEventListener("pointerenter", () => abrirLeque(true));
      grupo.addEventListener("pointerleave", () => abrirLeque(false));

      pistaGente.appendChild(grupo);
    }

    /* Desconhecidos: fora do eixo, grade de 8 colunas com rolagem própria */
    for (const p of semAno) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tl-person tl-person--sem";
      btn.setAttribute("aria-label", `${p.name} — nascimento desconhecido`);
      btn.appendChild(miniAvatar(p, 32, portraits));
      const aoEntrar = () => {
        mostrarDica(btn, p.name, "Nascimento desconhecido");
        /* sem ano não há linha a destacar */
        guia.hidden = true;
      };
      btn.addEventListener("pointerenter", aoEntrar);
      btn.addEventListener("focus", aoEntrar);
      btn.addEventListener("pointerleave", esconderDica);
      btn.addEventListener("blur", esconderDica);
      btn.addEventListener("click", () => abrir(p, btn));
      pistaSem.appendChild(btn);
    }

    const stage = timeline.querySelector(".tl-stage");
    stage.scrollLeft = rolagemInicial === null ? 0 : rolagemInicial;
    rolagemInicial = null;

    /* zoom pelo scroll, mantendo fixo o ano sob o cursor */
    stage.addEventListener("wheel", (e) => {
      if (!e.deltaY) return;
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      const antes = stage.scrollLeft + (e.clientX - r.left);
      const anterior = zoomLinha;
      zoomLinha = Math.min(6, Math.max(1, zoomLinha * (e.deltaY < 0 ? 1.18 : 1 / 1.18)));
      if (zoomLinha === anterior) return;
      rolagemInicial = antes * (zoomLinha / anterior) - (e.clientX - r.left);
      montarLinha();
    }, { passive: false });

    atualizarContador();
  }

  function trocarModo(novo) {
    mode = novo;
    modeButtons.forEach((b) => b.classList.toggle("is-on", b.dataset.mode === novo));
    grid.hidden = novo !== "grid";
    timeline.hidden = novo !== "timeline";
    if (novo === "timeline") montarLinha();
    else atualizarContador();
  }

  modeButtons.forEach((b) => b.addEventListener("click", () => trocarModo(b.dataset.mode)));

  /* ---------- Filtros combinados ---------- */
  function matchSpecies(p) {
    if (speciesFilter === "all") return true;
    const nome = speciesNameOf(p, speciesMap);
    if (speciesFilter === "human") return nome === "Human";
    if (speciesFilter === "droid") return nome === "Droid";
    return nome !== "Human" && nome !== "Droid";
  }

  function applyFilter() {
    const term = searchInput.value.trim().toLowerCase();
    const lista = people
      .filter(
        (p) =>
          (!term || p.name.toLowerCase().includes(term)) &&
          matchSpecies(p) &&
          (!filmFilter || (p.films || []).includes(filmFilter))
      )
      .sort(COMPARADORES[sortBy] || COMPARADORES.name);
    paint(lista);
    if (mode === "timeline") montarLinha();
  }

  filterPills.forEach((pill) => {
    pill.addEventListener("click", async () => {
      /* os filtros de espécie dependem do mapa: espera antes de aplicar */
      if (pill.dataset.filter !== "all" && !speciesMap.size) {
        speciesMap = await getSpeciesMap();
      }
      speciesFilter = pill.dataset.filter;
      filterPills.forEach((b) => b.classList.toggle("is-on", b === pill));
      applyFilter();
    });
  });

  filmSelect.addEventListener("change", () => {
    filmFilter = filmSelect.value;
    applyFilter();
  });

  sortSelect.addEventListener("change", () => {
    sortBy = sortSelect.value;
    if (mode === "timeline") { applyFilter(); return; }
    ordenarComFlip();
  });

  applyFilter();
  searchInput.addEventListener("input", applyFilter);

  /* Chegou de outra view pedindo um personagem (elenco do modal de filme):
     abre o modal dele e deixa o card à vista. */
  const intent = takeIntent("people");
  if (intent && intent.name) {
    const alvo = people.find((p) => p.name === intent.name);
    if (alvo) {
      const card = [...grid.querySelectorAll(".person-card")].find(
        (el) => el.querySelector(".name")?.textContent === alvo.name
      );
      card?.scrollIntoView({ block: "center" });
      abrir(alvo, card || null);
    }
  }
}

/* ---------------- Modal ---------------- */

const FICHA = [
  ["Altura", (p) => numero(p.height, "cm")],
  ["Massa", (p) => numero(p.mass, "kg")],
  ["Nascimento", (p) => legivel(p.birth_year)],
  ["Gênero", (p) => traduzir(p.gender, GENERO)],
  ["Cabelo", (p) => traduzir(p.hair_color, CORES)],
  ["Olhos", (p) => traduzir(p.eye_color, CORES)],
  ["Pele", (p) => traduzir(p.skin_color, CORES)],
];

/* Silhueta neutra de 180 cm — só uma referência de escala, sem traço de
   nenhum personagem em particular. */
const SILHUETA = `
<svg class="hr-figure" viewBox="0 0 40 180" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
  <circle cx="20" cy="16" r="12"/>
  <rect x="12" y="30" width="16" height="52" rx="7"/>
  <rect x="2" y="34" width="9" height="44" rx="4.5"/>
  <rect x="29" y="34" width="9" height="44" rx="4.5"/>
  <rect x="12" y="84" width="7" height="92" rx="3.5"/>
  <rect x="21" y="84" width="7" height="92" rx="3.5"/>
</svg>`;

/* Duas primeiras linhas do crawl de abertura, buscadas sob demanda e
   memorizadas por filme: o tooltip de Aparições só custa a primeira vez. */
const cacheCrawl = new Map();

function crawlDe(url) {
  if (!cacheCrawl.has(url)) {
    cacheCrawl.set(
      url,
      fetch(url)
        .then((r) => r.json())
        .then((f) =>
          String(f.opening_crawl || "")
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .slice(0, 2)
            .join(" ")
            /* as linhas do crawl são curtas e quebradas como no filme: duas
               delas param no meio da frase, então marcamos que continua */
            .replace(/[^.!?]$/, "$&…")
        )
        .catch(() => "")
    );
  }
  return cacheCrawl.get(url);
}

const SAIDA_CUBICA = "cubic-bezier(0.215, 0.61, 0.355, 1)";

export async function renderPersonModal(person, ctx = {}) {
  const {
    list = [person],
    navigate,
    all = [],
    portraits: retratosCtx = null,
    filtrarPorEspecie = null,
  } = ctx;
  let index = ctx.index ?? 0;
  let origem = ctx.cardEl || null;
  let miniPlaneta = null;
  let pedido = 0;
  let trocando = false;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop is-person";
  backdrop.innerHTML = `
    <button class="modal-nav modal-nav--prev" type="button" aria-label="Personagem anterior">‹</button>
    <div class="modal modal-person pm-armed" role="dialog" aria-modal="true" aria-label="Detalhes do personagem">
      <button class="modal-close" type="button" aria-label="Fechar">×</button>
      <div class="pm-grid">
        <div class="pm-left">
          <div class="pm-photo-stage pm-anim" style="--i:0">
            <div class="modal-photo-wrap">
              <span class="person-avatar-fallback"></span>
              <span class="pm-gloss" aria-hidden="true"></span>
            </div>
            <svg class="pm-ring" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="48"/>
            </svg>
          </div>
          <div class="pm-head pm-anim" style="--i:1">
            <h3></h3>
            <div class="pm-ident">
              <span class="pill" id="modal-species">Carregando…</span>
              <button class="pill pill-link" id="modal-homeworld" type="button">Carregando…</button>
            </div>
          </div>
        </div>
        <div class="pm-scale pm-anim" style="--i:2">
          <div class="hr-box">
            <div class="hr-silhueta">${SILHUETA}<span class="hr-ref">180</span></div>
            <div class="hr-bar-wrap"><span class="hr-value"></span><span class="hr-bar"></span></div>
          </div>
          <div class="mass-gauge">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <circle class="mg-track" cx="24" cy="24" r="19"/>
              <circle class="mg-fill" cx="24" cy="24" r="19"/>
            </svg>
            <span class="mg-value"></span>
          </div>
        </div>
        <div class="pm-right">
          <div class="pm-stats pm-anim" style="--i:3"></div>
          <div class="pm-section pm-anim" style="--i:4">
            <h4>Aparições</h4>
            <div class="pill-list" data-slot="films"><span class="value">Carregando…</span></div>
          </div>
          <div class="pm-section pm-anim" style="--i:5" data-slot="craft-wrap" hidden>
            <h4>Pilota</h4>
            <div class="pill-list" data-slot="craft"></div>
          </div>
          <div class="pm-section pm-anim" style="--i:6" data-slot="planeta-wrap" hidden>
            <h4>Do mesmo planeta</h4>
            <div class="conn-list" data-slot="conn-planeta"></div>
          </div>
          <div class="pm-section pm-anim" style="--i:7" data-slot="especie-wrap" hidden>
            <h4>Da mesma espécie</h4>
            <div class="conn-list" data-slot="conn-especie"></div>
          </div>
        </div>
      </div>
      <span class="crawl-tip" role="tooltip" hidden></span>
    </div>
    <button class="modal-nav modal-nav--next" type="button" aria-label="Próximo personagem">›</button>
  `;
  document.body.appendChild(backdrop);

  const modal = backdrop.querySelector(".modal-person");
  const fotoStage = backdrop.querySelector(".pm-photo-stage");
  const anel = backdrop.querySelector(".pm-ring circle");
  const gloss = backdrop.querySelector(".pm-gloss");
  const direita = backdrop.querySelector(".pm-right");
  const dicaCrawl = backdrop.querySelector(".crawl-tip");
  const photoWrap = backdrop.querySelector(".modal-photo-wrap");
  const fallback = backdrop.querySelector(".person-avatar-fallback");
  const titulo = backdrop.querySelector("h3");
  const especiePill = backdrop.querySelector("#modal-species");
  const homePill = backdrop.querySelector("#modal-homeworld");
  const stats = backdrop.querySelector(".pm-stats");
  const filmsSlot = backdrop.querySelector('[data-slot="films"]');
  const craftWrap = backdrop.querySelector('[data-slot="craft-wrap"]');
  const craftSlot = backdrop.querySelector('[data-slot="craft"]');
  const hrBar = backdrop.querySelector(".hr-bar");
  const hrValue = backdrop.querySelector(".hr-value");
  const mgFill = backdrop.querySelector(".mg-fill");
  const mgValue = backdrop.querySelector(".mg-value");
  const conn = {
    planetaWrap: backdrop.querySelector('[data-slot="planeta-wrap"]'),
    planeta: backdrop.querySelector('[data-slot="conn-planeta"]'),
    especieWrap: backdrop.querySelector('[data-slot="especie-wrap"]'),
    especie: backdrop.querySelector('[data-slot="conn-especie"]'),
  };

  let fechando = false;

  /* FLIP: a foto do card vai até a foto do modal (e volta ao fechar),
     enquanto o cartão escala de 0.9 a 1. */
  function voar(paraTras) {
    const alvo = origem && origem.querySelector(".person-photo-wrap");
    if (!alvo || REDUCE || !modal.animate) return null;

    const c = alvo.getBoundingClientRect();
    const m = fotoStage.getBoundingClientRect();
    if (!c.width || !m.width) return null;

    const dx = c.left + c.width / 2 - (m.left + m.width / 2);
    const dy = c.top + c.height / 2 - (m.top + m.height / 2);
    const k = c.width / m.width;

    const doCard = { transform: `translate(${dx}px, ${dy}px) scale(${k})` };
    const noModal = { transform: "none" };
    const opcoes = { duration: 300, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" };

    fotoStage.animate(paraTras ? [noModal, doCard] : [doCard, noModal], opcoes);
    modal.animate(
      paraTras
        ? [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(0.9)", opacity: 0 }]
        : [{ transform: "scale(0.9)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
      opcoes
    );
    backdrop.animate(
      paraTras ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }],
      { duration: 300, easing: "ease-out" }
    );
    return opcoes.duration;
  }

  /* ---------- Entrada em cascata ----------
     Os blocos só começam a aparecer quando o cartão termina de escalar; o
     escalonamento de 40ms sai do --i que cada bloco carrega no markup. */
  function cascata(atraso) {
    if (REDUCE) { modal.classList.remove("pm-armed"); return; }
    setTimeout(() => {
      if (!modal.isConnected) return;
      modal.classList.remove("pm-armed");
      modal.classList.add("pm-run");
    }, atraso);
  }

  /* ---------- Anel da foto ----------
     O <circle> é desenhado do zero em 500ms e fecha com um pulso de glow. */
  function desenharAnel() {
    const volta = 2 * Math.PI * 48;
    anel.style.strokeDasharray = `${volta}`;
    if (REDUCE || !anel.animate) { anel.style.strokeDashoffset = "0"; return; }
    anel.style.strokeDashoffset = "0";
    const risco = anel.animate(
      [{ strokeDashoffset: volta }, { strokeDashoffset: 0 }],
      { duration: 500, easing: "ease-out" }
    );
    risco.onfinish = () => {
      if (!fotoStage.isConnected) return;
      fotoStage.classList.add("is-pulsing");
      setTimeout(() => fotoStage.classList.remove("is-pulsing"), 220);
    };
  }

  /* ---------- Contadores ----------
     Altura, massa, barra e medidor saem todos do MESMO tique: um valor só,
     com easing out-cubic, garante que o número e o preenchimento cheguem
     juntos ao fim dos 600ms. */
  function animarValor(duracao, aplicar, aindaVale) {
    if (REDUCE) { aplicar(1); return; }
    let passado = 0;
    const passo = (dt) => {
      if (!aindaVale()) { unsubscribe(passo); return; }
      passado += dt * 1000;
      const k = Math.min(1, passado / duracao);
      aplicar(1 - Math.pow(1 - k, 3));
      if (k >= 1) unsubscribe(passo);
    };
    aplicar(0);
    subscribe(passo);
  }

  function sumir() {
    if (miniPlaneta) miniPlaneta.destroy();
    document.removeEventListener("keydown", onKey);
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

  function onKey(e) {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); pular(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); pular(1); }
  }

  /* ---------- Troca de personagem com deslize ----------
     A ficha sai 40px no sentido da navegação, o conteúdo é trocado fora da
     vista e volta pelo lado oposto; a foto faz crossfade. Enquanto isso o
     modal não aceita clique, para não empilhar duas trocas. */
  function deslizar(direcao, trocar) {
    if (trocando) return;
    if (REDUCE || !direita.animate) { trocar(); return; }

    trocando = true;
    modal.classList.add("is-swapping");

    const fora = { duration: 150, easing: "ease-in", fill: "forwards" };
    const saiFicha = direita.animate(
      [{ transform: "none", opacity: 1 }, { transform: `translateX(${-40 * direcao}px)`, opacity: 0 }],
      fora
    );
    const saiFoto = fotoStage.animate([{ opacity: 1 }, { opacity: 0 }], fora);

    saiFicha.onfinish = () => {
      trocar();
      direita.scrollTop = 0;
      saiFicha.cancel();
      saiFoto.cancel();
      const dentro = { duration: 200, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" };
      direita.animate(
        [{ transform: `translateX(${40 * direcao}px)`, opacity: 0 }, { transform: "none", opacity: 1 }],
        dentro
      );
      fotoStage.animate([{ opacity: 0 }, { opacity: 1 }], dentro);
      modal.classList.remove("is-swapping");
      trocando = false;
    };
  }

  function pular(passo) {
    if (list.length < 2 || trocando) return;
    deslizar(passo, () => {
      index = (index + passo + list.length) % list.length;
      origem = null;               /* só a primeira abertura nasce do card */
      mostrar(list[index]);
    });
  }

  /* Conexões: troca o personagem exibido sem fechar o modal. Se ele estiver
     na lista filtrada, as setas passam a andar a partir dele. */
  function irPara(outro) {
    if (trocando) return;
    deslizar(1, () => {
      const i = list.indexOf(outro);
      if (i >= 0) index = i;
      origem = null;
      mostrar(outro);
    });
  }

  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector(".modal-close").addEventListener("click", close);
  backdrop.querySelector(".modal-nav--prev").addEventListener("click", () => pular(-1));
  backdrop.querySelector(".modal-nav--next").addEventListener("click", () => pular(1));
  document.addEventListener("keydown", onKey);

  if (list.length < 2) {
    backdrop.querySelectorAll(".modal-nav").forEach((b) => b.remove());
  }

  /* ---------- Pinta um personagem ---------- */
  async function mostrar(p) {
    const meu = ++pedido;

    modal.setAttribute("aria-label", `Detalhes de ${p.name}`);
    titulo.textContent = p.name;
    fallback.textContent = initials(p.name);
    fallback.setAttribute("style", avatarStyle(p.name));
    fallback.classList.remove("is-hidden");
    photoWrap.querySelector(".person-photo")?.remove();

    stats.innerHTML = FICHA.map(
      ([rotulo, fn]) =>
        `<div class="pm-stat"><span class="label">${rotulo}</span><span class="value">${fn(p)}</span></div>`
    ).join("");

    especiePill.textContent = "Carregando…";
    homePill.textContent = "Carregando…";
    filmsSlot.innerHTML = '<span class="value">Carregando…</span>';
    craftWrap.hidden = true;
    craftSlot.innerHTML = "";
    if (miniPlaneta) { miniPlaneta.destroy(); miniPlaneta = null; }

    const [especie, planeta, portraits, filmsMap, craftMap, speciesMap] = await Promise.all([
      getPersonSpecies(p),
      getPlanetName(p.homeworld),
      getPortraits(),
      getFilmsMap(),
      getCraftMap(),
      getSpeciesMap(),
    ]);
    if (meu !== pedido) return;    /* já pularam para outro personagem */

    especiePill.textContent = especie;
    modal.style.setProperty("--sp", speciesColor(speciesNameOf(p, speciesMap)));

    /* O retrato passa pelo mesmo veredito em cache da grade; o `meu` evita
       que uma foto atrasada caia em cima do personagem seguinte. */
    resolverFoto(portraits.get(p.name.trim().toLowerCase())).then((valida) => {
      if (meu !== pedido || !valida) return;
      carregarFoto(photoWrap, valida);
    });

    /* régua de altura e medidor de massa: um contador só, 600ms out-cubic,
       move o número, a barra e o arco ao mesmo tempo */
    const altura = numeroCru(p.height);
    const massa = numeroCru(p.mass);
    const alvoBarra = altura === null ? 0 : Math.min(100, (altura / 225) * 100);
    const volta = 2 * Math.PI * 19;
    const fracao = massa === null ? 0 : Math.min(1, massa / 100);

    hrBar.classList.toggle("is-over", altura !== null && altura > 180);
    mgValue.classList.toggle("is-over", massa !== null && massa > 100);
    mgFill.style.strokeDasharray = `${volta}`;

    animarValor(
      600,
      (k) => {
        hrBar.style.height = `${alvoBarra * k}%`;
        hrValue.textContent =
          altura === null ? "?" : `${Math.round(altura * k).toLocaleString("pt-BR")} cm`;
        mgFill.style.strokeDashoffset = `${volta * (1 - fracao * k)}`;
        mgValue.textContent =
          massa === null ? "?" : `${Math.round(massa * k).toLocaleString("pt-BR")} kg`;
      },
      () => meu === pedido && modal.isConnected
    );

    /* conexões: mesmo planeta natal e mesma espécie.
       A chave é o NOME da espécie, o mesmo que as pílulas da grade usam —
       comparar a url crua separava em dois grupos quem a SWAPI registra
       como humano explícito e quem ela deixa com `species` vazio, e aí a
       conta do chip "+N outros" não batia com a da grade filtrada. */
    const retratos = retratosCtx || portraits;
    const chaveEspecie = (x) => speciesNameOf(x, speciesMap);
    const montarConexoes = (wrap, slot, pessoas, extra = null) => {
      slot.innerHTML = "";
      if (!pessoas.length) { wrap.hidden = true; return; }
      wrap.hidden = false;
      for (const outro of pessoas) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "conn-item";
        b.setAttribute("aria-label", outro.name);
        b.title = outro.name;
        b.appendChild(miniAvatar(outro, 32, retratos));
        b.addEventListener("click", () => irPara(outro));
        slot.appendChild(b);
      }
      if (extra) slot.appendChild(extra);
    };

    montarConexoes(
      conn.planetaWrap, conn.planeta,
      all.filter((x) => x !== p && x.homeworld && x.homeworld === p.homeworld).slice(0, 8)
    );

    /* Humanos são 35 dos 82: listar todos vira parede de avatares. Mostramos
       os 6 mais próximos — os que dividem mais filmes com ele — e mandamos o
       resto para a grade já filtrada. As outras espécies seguem como antes. */
    const mesmaEspecie = all.filter((x) => x !== p && chaveEspecie(x) === chaveEspecie(p));
    const ehHumano = chaveEspecie(p) === "Human";
    if (ehHumano && mesmaEspecie.length > 6) {
      const meusFilmes = new Set(p.films || []);
      const relevantes = [...mesmaEspecie]
        .sort(
          (a, b) =>
            (b.films || []).filter((f) => meusFilmes.has(f)).length -
            (a.films || []).filter((f) => meusFilmes.has(f)).length
        )
        .slice(0, 6);

      const restantes = mesmaEspecie.length - relevantes.length;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "pill pill-link conn-more";
      chip.textContent = `+${restantes} outros`;
      chip.title = "Ver todos os humanos na grade";
      chip.addEventListener("click", () => {
        if (!filtrarPorEspecie) return;
        close();
        filtrarPorEspecie("human");
      });
      montarConexoes(conn.especieWrap, conn.especie, relevantes, chip);
    } else {
      montarConexoes(conn.especieWrap, conn.especie, mesmaEspecie.slice(0, 8));
    }

    /* planeta natal: nome + mini-planeta procedural, clicável */
    homePill.textContent = "";
    const canvas = document.createElement("canvas");
    canvas.className = "pm-planet";
    canvas.setAttribute("aria-hidden", "true");
    const rotulo = document.createElement("span");
    rotulo.textContent = planeta;
    homePill.append(canvas, rotulo);
    if (planeta !== "Desconhecido") {
      try {
        const bruto = await fetch(p.homeworld).then((r) => r.json());
        if (meu !== pedido) return;
        miniPlaneta = createPlanetView(canvas, bruto, { size: 24, slices: 24 });
      } catch (_) { /* sem o planeta cru, fica só o nome */ }
    }

    /* aparições — a url fica na pílula para o tooltip do crawl */
    const filmes = (p.films || [])
      .map((url) => (filmsMap.has(url) ? { url, ...filmsMap.get(url) } : null))
      .filter(Boolean)
      .sort((a, b) => a.episode - b.episode);
    filmsSlot.innerHTML = filmes.length
      ? filmes
          .map((f) => `<span class="pill pill-film" data-film="${f.url}" tabindex="0">Ep. ${f.episode} — ${f.title}</span>`)
          .join("")
      : '<span class="value">Nenhuma</span>';

    /* pilota */
    const naves = [...(p.starships || []), ...(p.vehicles || [])]
      .map((url) => craftMap.get(url))
      .filter(Boolean);
    if (naves.length) {
      craftWrap.hidden = false;
      craftSlot.innerHTML = naves
        .map((c) => `<button class="pill pill-link" type="button" data-kind="${c.kind}" data-name="${c.name}">${c.name}</button>`)
        .join("");
    }
  }

  /* ---------- Atalhos para outras views ---------- */
  homePill.addEventListener("click", () => {
    const nome = homePill.textContent.trim();
    if (!navigate || !nome || nome === "Carregando…" || nome === "Desconhecido") return;
    setIntent("planets", { name: nome });
    close();
    navigate("planets");
  });

  craftSlot.addEventListener("click", (e) => {
    const btn = e.target.closest(".pill-link");
    if (!btn || !navigate) return;
    setIntent("vehicles", { kind: btn.dataset.kind, name: btn.dataset.name });
    close();
    navigate("vehicles");
  });

  /* ---------- Tooltip com o crawl do filme ----------
     Fica em posição fixa: a ficha rola, e um tooltip dentro dela seria
     cortado pelo overflow da coluna. */
  let filmeNaDica = null;
  let pillNaDica = null;

  function mostrarCrawl(pill) {
    const url = pill.dataset.film;
    if (!url) return;
    filmeNaDica = url;
    pillNaDica = pill;
    dicaCrawl.hidden = false;
    dicaCrawl.textContent = "…";
    posicionarCrawl();
    crawlDe(url).then((texto) => {
      if (filmeNaDica !== url || !dicaCrawl.isConnected) return;
      dicaCrawl.textContent = texto || "Sem texto de abertura.";
      posicionarCrawl();
    });
  }

  function posicionarCrawl() {
    if (!pillNaDica) return;
    const r = pillNaDica.getBoundingClientRect();
    const m = modal.getBoundingClientRect();
    dicaCrawl.style.left = `${r.left + r.width / 2 - m.left}px`;
    dicaCrawl.style.top = `${r.bottom - m.top + 8}px`;
  }

  function esconderCrawl() {
    filmeNaDica = null;
    pillNaDica = null;
    dicaCrawl.hidden = true;
  }

  filmsSlot.addEventListener("pointerover", (e) => {
    const pill = e.target.closest(".pill-film");
    if (pill) mostrarCrawl(pill);
  });
  filmsSlot.addEventListener("pointerout", (e) => {
    if (e.target.closest(".pill-film")) esconderCrawl();
  });
  filmsSlot.addEventListener("focusin", (e) => {
    const pill = e.target.closest(".pill-film");
    if (pill) mostrarCrawl(pill);
  });
  filmsSlot.addEventListener("focusout", esconderCrawl);

  /* A ficha rola por baixo do tooltip (ele é posicionado no cartão, não na
     coluna). Em vez de sumir, ele acompanha a pílula — e só desiste quando
     ela sai do trecho visível da coluna. */
  direita.addEventListener("scroll", () => {
    if (!pillNaDica) return;
    const p = pillNaDica.getBoundingClientRect();
    const c = direita.getBoundingClientRect();
    if (p.bottom < c.top || p.top > c.bottom) { esconderCrawl(); return; }
    posicionarCrawl();
  }, { passive: true });

  /* ---------- Tilt da foto (só desktop) ----------
     A foto e o anel inclinam até 5° na direção do cursor; o reflexo anda no
     sentido contrário, como uma luz parada por trás do observador. */
  if (PONTEIRO_FINO && !REDUCE) {
    const TILT_MAX = 5;
    const alvo = { x: 0, y: 0, gx: 50, gy: 50 };
    const atual = { x: 0, y: 0, gx: 50, gy: 50 };
    let inscritoTilt = false;

    const lerp = (a, b, k) => a + (b - a) * k;

    const passoTilt = () => {
      atual.x = lerp(atual.x, alvo.x, 0.16);
      atual.y = lerp(atual.y, alvo.y, 0.16);
      atual.gx = lerp(atual.gx, alvo.gx, 0.16);
      atual.gy = lerp(atual.gy, alvo.gy, 0.16);

      const parado =
        Math.abs(atual.x - alvo.x) < 0.02 && Math.abs(atual.y - alvo.y) < 0.02;

      fotoStage.style.transform =
        alvo.x === 0 && alvo.y === 0 && parado
          ? ""
          : `perspective(520px) rotateX(${atual.x.toFixed(2)}deg) rotateY(${atual.y.toFixed(2)}deg)`;
      gloss.style.setProperty("--gx", `${atual.gx.toFixed(1)}%`);
      gloss.style.setProperty("--gy", `${atual.gy.toFixed(1)}%`);

      if (parado) { unsubscribe(passoTilt); inscritoTilt = false; }
    };

    const acordarTilt = () => {
      if (inscritoTilt) return;
      subscribe(passoTilt);
      inscritoTilt = true;
    };

    fotoStage.addEventListener("pointermove", (e) => {
      const r = fotoStage.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;   /* -0.5 … 0.5 */
      const ny = (e.clientY - r.top) / r.height - 0.5;
      alvo.y = nx * 2 * TILT_MAX;
      alvo.x = -ny * 2 * TILT_MAX;
      /* reflexo no sentido oposto ao do cursor */
      alvo.gx = 50 - nx * 60;
      alvo.gy = 50 - ny * 60;
      acordarTilt();
    }, { passive: true });

    fotoStage.addEventListener("pointerleave", () => {
      alvo.x = 0; alvo.y = 0; alvo.gx = 50; alvo.gy = 50;
      acordarTilt();
    }, { passive: true });
  }

  /* ---------- Órbita dos conterrâneos (só desktop) ----------
     No hover da pílula do planeta natal, os mini-avatares de "Do mesmo
     planeta" saem do lugar, dão uma volta em torno do mini-planeta da pílula
     e voltam. É FLIP: a posição final é a de sempre, só o caminho muda. */
  let orbitando = false;

  function orbitar() {
    if (orbitando || REDUCE || conn.planetaWrap.hidden) return;
    const canvas = homePill.querySelector(".pm-planet");
    const itens = [...conn.planeta.querySelectorAll(".conn-item")];
    if (!canvas || !itens.length || !itens[0].animate) return;

    const c = canvas.getBoundingClientRect();
    const cx = c.left + c.width / 2;
    const cy = c.top + c.height / 2;
    const RAIO = 34;
    const VOLTAS = 8;

    orbitando = true;
    let restantes = itens.length;

    itens.forEach((item, i) => {
      const r = item.getBoundingClientRect();
      const ix = r.left + r.width / 2;
      const iy = r.top + r.height / 2;
      const base = (i / itens.length) * Math.PI * 2;

      const quadros = [{ transform: "none", offset: 0 }];
      for (let v = 0; v <= VOLTAS; v++) {
        const ang = base + (v / VOLTAS) * Math.PI * 2;
        quadros.push({
          transform:
            `translate(${cx + Math.cos(ang) * RAIO - ix}px, ${cy + Math.sin(ang) * RAIO - iy}px) scale(0.8)`,
          offset: 0.18 + (v / VOLTAS) * 0.6,
        });
      }
      quadros.push({ transform: "none", offset: 1 });

      const anim = item.animate(quadros, { duration: 1200, easing: "ease-in-out" });
      anim.onfinish = () => { if (--restantes === 0) orbitando = false; };
      anim.oncancel = () => { if (--restantes === 0) orbitando = false; };
    });
  }

  if (PONTEIRO_FINO) homePill.addEventListener("pointerenter", orbitar);

  /* ---------- Abertura a partir do card ----------
     Antes de esperar a rede: o nome e as iniciais já estão na tela, e a
     cascata não fica represada até a primeira leva de requisições chegar. */
  const msAbertura = voar(false);
  cascata(msAbertura || 260);
  desenharAnel();

  await mostrar(person);
}
