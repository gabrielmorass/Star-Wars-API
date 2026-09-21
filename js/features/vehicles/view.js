import { setIntent, takeIntent } from "../../core/nav-intent.js";
import { classeDeNave, duracao } from "../../core/vocabulario.js";
import { getPeopleMap, getPortraits } from "../people/api.js";
import { miniAvatar } from "../people/avatar.js";
import { silhuetaDe, svgSilhueta, NOME_SILHUETA } from "./silhuetas.js";
import { escalaReal } from "./escala-real.js";
import { criarHangar, hangarDisponivel } from "./hangar.js";
import {
  ESCALA_LOG,
  formatar,
  linhaSemValor,
  medidor,
  normalizar,
  numeroDe,
  posicaoNaRegua,
  radar,
  regua,
  tabelaVitorias,
} from "./hud.js";

/* ---------------- Naves e Veículos ----------------
   A lista é uma grade de cards com silhueta por classe; o detalhe é um painel
   grudado (sticky) com HUD de medidores, régua de tamanho em escala log,
   radar de 5 eixos e comparação lado a lado.

   Contrato intocável desta view, que os testes afirmam:
     #vehicles-search, #vehicles-grid .info-card,
     [data-tab="starships"] / [data-tab="vehicles"], .tab-toggle .active,
     #vehicle-detail com "Modelo" quando há item e a frase
     "Selecione um item na lista para ver detalhes." quando não há,
     e a mensagem "Nenhum {nave|veículo} encontrado.". */

const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const VAZIO = "Selecione um item na lista para ver detalhes.";

function escapar(texto) {
  return String(texto).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

const classeDe = (item, aba) =>
  (aba === "starships" ? item.starship_class : item.vehicle_class) || "";

/* As métricas do HUD, na ordem em que aparecem. `so` restringe a uma aba. */
const METRICAS = [
  { campo: "max_atmosphering_speed", rotulo: "Velocidade atm.", unidade: "km/h" },
  { campo: "MGLT", rotulo: "MGLT", unidade: "", so: "starships" },
  { campo: "hyperdrive_rating", rotulo: "Hiperdrive", unidade: "", inverso: true, casas: 1, so: "starships" },
  { campo: "cargo_capacity", rotulo: "Carga", unidade: "kg" },
  { campo: "crew", rotulo: "Tripulação", unidade: "" },
  { campo: "passengers", rotulo: "Passageiros", unidade: "" },
  { campo: "cost_in_credits", rotulo: "Custo", unidade: "cr" },
];

/* Os 5 eixos do radar */
const EIXOS_RADAR = [
  { campo: "max_atmosphering_speed" },
  { campo: "hyperdrive_rating", inverso: true },
  { campo: "cargo_capacity" },
  { campo: "crew" },
  { campo: "cost_in_credits" },
];

export function renderVehiclesView(container, { starships, vehicles }, navigate) {
  const datasets = { starships, vehicles };
  const emptyLabel = { starships: "nave", vehicles: "veículo" };
  let current = "starships";
  let searchTerm = "";
  let classeFiltro = "";
  let ordem = "name";
  let selecionado = null;
  let comparado = null;
  let visiveis = [];

  /* Os três blocos são filhos diretos do grid (não há wrapper em volta da
     lista) porque o modo comparação só troca as `grid-template-areas`: o
     painel passa a ocupar a largura toda logo abaixo dos filtros e a lista
     desce. Sem mover nó nenhum no DOM. */
  container.innerHTML = `
    <div class="nv-layout">
      <div class="nv-topo">
        <div class="topnav tab-toggle" role="tablist">
          <button type="button" class="active" data-tab="starships" role="tab" aria-selected="true">Naves</button>
          <button type="button" data-tab="vehicles" role="tab" aria-selected="false">Veículos</button>
        </div>
        <div class="people-toolbar nv-bar">
          <input type="search" id="vehicles-search" placeholder="Buscar por nome…" aria-label="Buscar naves e veículos" />
          <label class="nv-ordem">
            <span>Ordenar</span>
            <select id="nv-sort" aria-label="Ordenar naves e veículos">
              <option value="name">Nome</option>
              <option value="length">Comprimento</option>
              <option value="cost_in_credits">Custo</option>
              <option value="max_atmosphering_speed">Velocidade</option>
            </select>
          </label>
        </div>
        <div class="filter-pills nv-classes" role="group" aria-label="Filtrar por classe"></div>
      </div>
      <div class="card-grid" id="vehicles-grid"></div>
      <div class="detail-panel" id="vehicle-detail">
        <p class="state-msg">${VAZIO}</p>
      </div>
    </div>
  `;

  const grid = container.querySelector("#vehicles-grid");
  const detail = container.querySelector("#vehicle-detail");
  const tabButtons = [...container.querySelectorAll("[data-tab]")];
  const searchInput = container.querySelector("#vehicles-search");
  const selectOrdem = container.querySelector("#nv-sort");
  const barraClasses = container.querySelector(".nv-classes");
  const layout = container.querySelector(".nv-layout");

  /* qual item está em cada card — sobrevive ao FLIP, que move os nós */
  const itemDoCard = new WeakMap();

  /* O hangar é caro (contexto WebGL) e o painel é redesenhado a cada
     seleção: por isso ele é criado UMA vez e só recebe `mostrar()` depois.
     Quando o host sai do DOM (comparação, ou painel vazio) ele é destruído
     e volta a nascer na próxima ficha simples. */
  let hangar = null;
  let hostHangar = null;

  function sincronizarHangar() {
    const host = detail.querySelector(".nv-hangar");

    if (!host) {
      hangar?.destroy();
      hangar = null;
      hostHangar = null;
      return;
    }

    if (host !== hostHangar) {
      hangar?.destroy();
      hangar = hangarDisponivel() ? criarHangar(host) : null;
      hostHangar = hangar ? host : null;
      if (!hangar) return;
    }

    hangar.mostrar(
      host.dataset.chave,
      host.dataset.metros === "" ? null : Number(host.dataset.metros),
      host.dataset.rotulo
    );
  }

  /* ---------------- Tetos por categoria ----------------
     Recalculados a cada troca de aba: uma nave e um speeder não dividem
     régua. Memorizado porque a lista não muda dentro da sessão. */
  const tetosPorAba = {};
  function tetos() {
    if (tetosPorAba[current]) return tetosPorAba[current];
    const lista = datasets[current];
    const t = {};
    for (const { campo } of METRICAS) {
      const nums = lista.map((x) => numeroDe(x[campo])).filter((n) => n !== null);
      t[campo] = nums.length ? Math.max(...nums) : 0;
      t[`${campo}:min`] = nums.length ? Math.min(...nums) : 0;
    }
    tetosPorAba[current] = t;
    return t;
  }

  function fracaoDe(item, campo, inverso) {
    const t = tetos();
    return normalizar(numeroDe(item[campo]), t[campo], {
      log: ESCALA_LOG.has(campo),
      inverso,
      piso: t[`${campo}:min`],
    });
  }

  /* ---------------- Filtro de classe ----------------
     As pills são geradas do dado da aba corrente, agrupadas pela silhueta —
     45 strings de classe crua virariam 45 pills inúteis. */
  function montarClasses() {
    const contagem = new Map();
    for (const item of datasets[current]) {
      const chave = silhuetaDe(classeDe(item, current));
      contagem.set(chave, (contagem.get(chave) || 0) + 1);
    }
    const ordenadas = [...contagem.entries()].sort((a, b) => b[1] - a[1]);

    barraClasses.innerHTML =
      `<button class="filter-pill${classeFiltro === "" ? " is-on" : ""}" type="button" data-classe="">Todas</button>` +
      ordenadas
        .map(
          ([chave, n]) => `
        <button class="filter-pill nv-pill${classeFiltro === chave ? " is-on" : ""}" type="button" data-classe="${chave}">
          ${svgSilhueta(chave, 16)}${NOME_SILHUETA[chave]} <i>${n}</i>
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
    paintGrid();
  });

  /* ---------------- Lista ---------------- */
  const COMPARADORES = {
    name: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
    /* desconhecido vai para o fim em qualquer ordenação numérica */
    _num: (campo) => (a, b) => {
      const x = numeroDe(a[campo]);
      const y = numeroDe(b[campo]);
      if (x === null && y === null) return a.name.localeCompare(b.name, "pt-BR");
      if (x === null) return 1;
      if (y === null) return -1;
      return y - x;
    },
  };

  function comparador() {
    return ordem === "name" ? COMPARADORES.name : COMPARADORES._num(ordem);
  }

  function filtrar() {
    return datasets[current]
      .filter((item) => item.name.toLowerCase().includes(searchTerm))
      .filter((item) => !classeFiltro || silhuetaDe(classeDe(item, current)) === classeFiltro)
      .sort(comparador());
  }

  function cardHTML(item, i) {
    const classe = classeDe(item, current);
    const chave = silhuetaDe(classe);
    return `
      <button class="info-card nv-card${selecionado === item ? " is-sel" : ""}"
              data-index="${i}" type="button" aria-pressed="${selecionado === item}">
        <span class="nv-sil" aria-hidden="true">${svgSilhueta(chave, 34)}</span>
        <span class="nv-txt">
          <h3>${escapar(item.name)}</h3>
          <p class="meta">${escapar(item.model)}</p>
        </span>
        <span class="pill nv-classe">${escapar(classeDeNave(classe)) || "sem classe"}</span>
      </button>`;
  }

  function paintGrid({ comFlip = false } = {}) {
    const antes = comFlip
      ? new Map([...grid.querySelectorAll(".nv-card")].map((el) => [itemDoCard.get(el), el.getBoundingClientRect()]))
      : null;

    visiveis = filtrar();

    grid.innerHTML = visiveis.length
      ? visiveis.map(cardHTML).join("")
      : `<p class="state-msg">Nenhum ${emptyLabel[current]} encontrado.</p>`;

    grid.querySelectorAll(".nv-card").forEach((el, i) => {
      itemDoCard.set(el, visiveis[i]);
      el.addEventListener("click", () => selectItem(visiveis[i]));
    });

    if (antes && !REDUCE) tocarFlip(antes);
  }

  /* FLIP: os cards novos já estão na posição final; medimos de onde vieram e
     animamos a diferença. Card que não existia antes só aparece. */
  function tocarFlip(antes) {
    grid.querySelectorAll(".nv-card").forEach((el) => {
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

  /* ---------------- Painel de detalhe ---------------- */
  function metricasDaAba() {
    return METRICAS.filter((m) => !m.so || m.so === current);
  }

  /* Arco só para métrica que TEM número. O que vier "unknown"/"n/a" sai numa
     lista de texto abaixo — um arco em zero com "desconhecido" dentro mentia
     (zero é um valor) e ainda estourava a caixa. */
  function blocoMedidores(item, outro) {
    const comValor = [];
    const semValor = [];

    metricasDaAba().forEach((m) => {
      const n = numeroDe(item[m.campo]);
      if (n === null) {
        semValor.push(m);
        return;
      }
      let vencedor = null;
      if (outro) {
        const o = numeroDe(outro[m.campo]);
        if (o !== null && n !== o) vencedor = m.inverso ? n < o : n > o;
      }
      comValor.push({ m, vencedor });
    });

    const arcos = comValor
      .map(({ m, vencedor }, i) =>
        medidor({
          rotulo: m.rotulo,
          bruto: item[m.campo],
          unidade: m.unidade,
          fracao: fracaoDe(item, m.campo, m.inverso),
          casas: m.casas || 0,
          indice: i,
          vencedor,
        })
      )
      .join("");

    const faltantes = semValor.length
      ? `<ul class="hud-faltantes">${semValor.map((m) => linhaSemValor(m.rotulo)).join("")}</ul>`
      : "";

    return `<div class="nv-hud">${arcos}</div>${faltantes}`;
  }

  /* Linhas da tabela de vitórias: só métrica em que os DOIS têm número —
     não há como declarar vencedor contra um desconhecido. */
  function linhasDeVitoria(a, b) {
    return metricasDaAba()
      .map((m) => {
        const x = numeroDe(a[m.campo]);
        const y = numeroDe(b[m.campo]);
        if (x === null || y === null) return null;
        const melhorA = m.inverso ? x < y : x > y;
        const unid = m.unidade ? ` ${m.unidade}` : "";
        return {
          rotulo: m.rotulo,
          textoA: formatar(a[m.campo], m.casas || 0) + unid,
          textoB: formatar(b[m.campo], m.casas || 0) + unid,
          vence: x === y ? "igual" : melhorA ? "a" : "b",
        };
      })
      .filter(Boolean);
  }

  function fracoesRadar(item) {
    return EIXOS_RADAR.map((e) => fracaoDe(item, e.campo, e.inverso));
  }

  /* O hangar 3D ocupa a largura do painel; a silhueta SVG fica dentro dele
     como fallback (sem WebGL, com prefers-reduced-motion, ou enquanto o
     three.js não chegou do CDN). Em comparação não há hangar: são dois
     cabeçalhos e só existe um contexto WebGL — ali a leitura de forma já é
     feita pelo painel de escala real. */
  function cabecalho(item, comHangar) {
    const classe = classeDe(item, current);
    const chave = silhuetaDe(classe);
    const comp = numeroDe(item.length);
    return `
      <div class="nv-head${comHangar ? " tem-hangar" : ""}">
        ${
          comHangar
            ? `<div class="nv-hangar" data-chave="${chave}"
                    data-metros="${comp === null ? "" : comp}"
                    data-rotulo="${comp === null ? "" : `${comp.toLocaleString("pt-BR")} m`}">
                 <span class="nv-head-sil" aria-hidden="true">${svgSilhueta(chave, 120, "sil--desenha")}</span>
               </div>`
            : `<span class="nv-head-sil" aria-hidden="true">${svgSilhueta(chave, 90, "sil--desenha")}</span>`
        }
        <div class="nv-head-txt">
          <h3>${escapar(item.name)}</h3>
          <div class="fm-pills nv-head-pills">
            <span class="pill">${escapar(item.model)}</span>
            <span class="pill">${escapar(item.manufacturer)}</span>
            <span class="pill">${escapar(classeDeNave(classe)) || "sem classe"}</span>
          </div>
        </div>
      </div>`;
  }

  /* O rótulo "Modelo" tem que existir no DOM sempre que há item selecionado —
     é o que o teste usa para saber que o painel saiu do estado vazio. */
  function fichaTexto(item) {
    const comp = numeroDe(item.length);
    return `
      <div class="detail-row"><div class="label">Modelo</div><div class="value">${escapar(item.model)}</div></div>
      <div class="detail-row"><div class="label">Comprimento</div><div class="value">${comp === null ? "desconhecido" : `${comp.toLocaleString("pt-BR")} m`}</div></div>
      <div class="detail-row"><div class="label">Consumíveis</div><div class="value">${duracao(item.consumables)}</div></div>`;
  }

  function selectItem(item) {
    if (!item) return;
    selecionado = item;
    comparado = null;
    pintarDetalhe();
    grid.querySelectorAll(".nv-card").forEach((el) => {
      const on = itemDoCard.get(el) === item;
      el.classList.toggle("is-sel", on);
      el.setAttribute("aria-pressed", String(on));
    });
  }

  function pintarDetalhe() {
    if (!selecionado) {
      layout.classList.remove("is-comparando");
      hangar?.destroy();
      hangar = null;
      hostHangar = null;
      detail.innerHTML = `<p class="state-msg">${VAZIO}</p>`;
      return;
    }
    const item = selecionado;
    const duplo = Boolean(comparado);

    /* O modo comparação é uma classe no grid: o painel passa a ocupar a
       largura inteira logo abaixo dos filtros e a lista desce. */
    layout.classList.toggle("is-comparando", duplo);

    /* "Escala real" vem ANTES dos medidores: é o enquadramento. Depois de
       ver a proporção verdadeira, os arcos normalizados são lidos pelo que
       são — comparação por métrica, não por tamanho. */
    const escala = duplo
      ? escalaReal(
          {
            nome: escapar(item.name),
            chave: silhuetaDe(classeDe(item, current)),
            metros: numeroDe(item.length),
          },
          {
            nome: escapar(comparado.name),
            chave: silhuetaDe(classeDe(comparado, current)),
            metros: numeroDe(comparado.length),
          }
        )
      : "";

    detail.innerHTML = `
      ${escala}
      <div class="nv-detalhe${duplo ? " is-duplo" : ""}">
        <div class="nv-col">
          ${cabecalho(item, !duplo)}
          ${fichaTexto(item)}
          ${blocoMedidores(item, comparado)}
        </div>
        ${
          duplo
            ? `<div class="nv-col nv-col--b">
                 ${cabecalho(comparado, false)}
                 ${fichaTexto(comparado)}
                 ${blocoMedidores(comparado, item)}
               </div>`
            : ""
        }
      </div>

      <div class="nv-secao">
        <h4>Tamanho</h4>
        ${regua()}
      </div>

      <div class="nv-secao">
        <h4>Perfil</h4>
        ${radar(fracoesRadar(item), duplo ? fracoesRadar(comparado) : null)}
        ${duplo ? `<p class="nv-legenda"><i class="nv-chip nv-chip--a"></i>${escapar(item.name)} <i class="nv-chip nv-chip--b"></i>${escapar(comparado.name)}</p>` : ""}
      </div>

      ${
        duplo
          ? `<div class="nv-secao">${tabelaVitorias(
              linhasDeVitoria(item, comparado),
              escapar(item.name),
              escapar(comparado.name)
            )}</div>`
          : ""
      }

      <div class="nv-secao nv-pilotos"></div>
      <div class="nv-secao nv-filmes"></div>

      <div class="nv-acoes">
        ${
          duplo
            ? `<button class="crawl-btn" type="button" data-act="fechar-cmp">Fechar comparação</button>`
            : `<button class="crawl-btn" type="button" data-act="comparar">Comparar</button>`
        }
      </div>
      <div class="nv-seletor" hidden></div>
    `;

    sincronizarHangar();
    desenharRegua(item, comparado);
    ligarMedidores();
    carregarPilotos(item);
    carregarFilmes(item);
  }

  /* Ligar os arcos: eles nascem em zero e recebem o valor no quadro seguinte,
     para a transição do CSS ter de onde sair. O flicker é classe à parte. */
  function ligarMedidores() {
    const arcos = detail.querySelectorAll(".hud-cheio");
    if (REDUCE) {
      arcos.forEach((a) => a.classList.add("is-on"));
      return;
    }
    detail.querySelectorAll(".hud-med").forEach((m) => m.classList.add("is-ligando"));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => arcos.forEach((a) => a.classList.add("is-on")));
    });
  }

  function desenharRegua(item, outro) {
    const barra = detail.querySelector(".rg-barra");
    if (!barra) return;
    const alvo = barra.querySelector(".rg-item");
    const comp = numeroDe(item.length);
    const pos = posicaoNaRegua(comp);

    if (pos === null) {
      alvo.hidden = true;
      barra.insertAdjacentHTML(
        "beforeend",
        `<span class="rg-sem">comprimento desconhecido</span>`
      );
      return;
    }

    /* a silhueta cresce com o log do comprimento, entre 18 e 64px: em escala
       real a Death Star apagaria qualquer outra coisa da barra */
    const lado = Math.round(18 + pos * 46);
    alvo.style.left = `${(pos * 100).toFixed(2)}%`;
    alvo.innerHTML =
      svgSilhueta(silhuetaDe(classeDe(item, current)), lado) +
      `<b>${comp.toLocaleString("pt-BR")} m</b>`;

    if (outro) {
      const c2 = numeroDe(outro.length);
      const p2 = posicaoNaRegua(c2);
      if (p2 !== null) {
        barra.insertAdjacentHTML(
          "beforeend",
          `<span class="rg-item rg-item--b" style="left:${(p2 * 100).toFixed(2)}%">
             ${svgSilhueta(silhuetaDe(classeDe(outro, current)), Math.round(18 + p2 * 46))}
             <b>${c2.toLocaleString("pt-BR")} m</b>
           </span>`
        );
      }
    }
  }

  /* ---------------- Pilotos e filmes ----------------
     Resolvidos sob demanda: a lista de pilotos de cada item vem como urls, e
     o mapa de retratos é o mesmo cache que Personagens e Filmes usam. */
  async function carregarPilotos(item) {
    const caixa = detail.querySelector(".nv-pilotos");
    if (!caixa) return;
    const urls = item.pilots || [];
    if (!urls.length) {
      caixa.remove();
      return;
    }
    caixa.innerHTML = `<h4>Pilotos</h4><div class="nv-gente"><span class="fm-skel fm-skel--cast"></span></div>`;

    /* `mapa` resolve url → personagem; `retratos` é o cache de fotos da
       grade de Personagens, indexado por nome — os dois são memorizados e
       compartilhados com Filmes, então isso não custa requisição nova. */
    const [mapa, retratos] = await Promise.all([
      getPeopleMap().catch(() => new Map()),
      getPortraits().catch(() => new Map()),
    ]);
    if (selecionado !== item) return;

    const gente = urls.map((u) => mapa.get(u)).filter(Boolean);

    if (!gente.length) {
      caixa.innerHTML = `<h4>Pilotos</h4><p class="nv-vazio">${urls.length} piloto(s) sem ficha na base.</p>`;
      return;
    }

    const alvo = document.createElement("div");
    alvo.className = "nv-gente";
    gente.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "nv-piloto";
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

    caixa.innerHTML = `<h4>Pilotos</h4>`;
    caixa.appendChild(alvo);
  }

  function carregarFilmes(item) {
    const caixa = detail.querySelector(".nv-filmes");
    if (!caixa) return;
    const urls = item.films || [];
    if (!urls.length) {
      caixa.remove();
      return;
    }
    /* o id do filme está na própria url (.../films/3) — não precisa buscar */
    const ids = urls
      .map((u) => Number(String(u).match(/films\/(\d+)/)?.[1]))
      .filter(Boolean)
      .sort((a, b) => a - b);

    caixa.innerHTML =
      `<h4>Aparições</h4><div class="nv-pills">` +
      ids
        .map(
          (id) =>
            `<button class="pill nv-filme" type="button" data-film="${id}">Episódio ${["", "I", "II", "III", "IV", "V", "VI"][id] || id}</button>`
        )
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

  /* ---------------- Comparação ---------------- */
  function abrirSeletor() {
    const caixa = detail.querySelector(".nv-seletor");
    if (!caixa) return;
    caixa.hidden = false;
    caixa.innerHTML = `
      <label class="nv-seletor-campo">
        <span>Comparar com</span>
        <input type="search" class="nv-cmp-busca" placeholder="Buscar ${emptyLabel[current]}…"
               aria-label="Buscar item para comparar" />
      </label>
      <div class="nv-cmp-lista" role="listbox"></div>`;

    const busca = caixa.querySelector(".nv-cmp-busca");
    const lista = caixa.querySelector(".nv-cmp-lista");

    function pintarLista() {
      const termo = busca.value.trim().toLowerCase();
      const opcoes = datasets[current]
        .filter((x) => x !== selecionado && x.name.toLowerCase().includes(termo))
        .slice(0, 8);
      lista.innerHTML = opcoes.length
        ? opcoes
            .map(
              (x, i) => `
          <button class="nv-cmp-op" type="button" role="option" data-i="${i}">
            ${svgSilhueta(silhuetaDe(classeDe(x, current)), 22)}
            <span>${escapar(x.name)}</span>
            <i>${escapar(classeDe(x, current))}</i>
          </button>`
            )
            .join("")
        : `<p class="nv-vazio">Nenhum ${emptyLabel[current]} encontrado.</p>`;

      lista.querySelectorAll(".nv-cmp-op").forEach((b) => {
        b.addEventListener("click", () => {
          comparado = opcoes[Number(b.dataset.i)];
          pintarDetalhe();
        });
      });
    }

    busca.addEventListener("input", pintarLista);
    pintarLista();
    busca.focus();
  }

  detail.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    if (btn.dataset.act === "comparar") abrirSeletor();
    if (btn.dataset.act === "fechar-cmp") {
      comparado = null;
      pintarDetalhe();
    }
  });

  /* ---------------- Abas, busca, ordenação ---------------- */
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.tab === current) return;
      current = btn.dataset.tab;
      classeFiltro = "";
      selecionado = null;
      comparado = null;
      tabButtons.forEach((b) => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-selected", String(b === btn));
      });
      layout.classList.remove("is-comparando");
      hangar?.destroy();
      hangar = null;
      hostHangar = null;
      detail.innerHTML = `<p class="state-msg">${VAZIO}</p>`;
      montarClasses();
      paintGrid();
    });
  });

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

  /* Veio do modal de Personagens ("Pilota"): abre já na aba certa e com o
     item selecionado. Sem intenção, nada muda. */
  const intent = takeIntent("vehicles");
  if (intent) {
    const alvo = (datasets[intent.kind] || []).find((item) => item.name === intent.name);
    if (alvo) {
      if (intent.kind !== current) {
        current = intent.kind;
        tabButtons.forEach((b) => {
          const on = b.dataset.tab === current;
          b.classList.toggle("active", on);
          b.setAttribute("aria-selected", String(on));
        });
        montarClasses();
        paintGrid();
      }
      selectItem(alvo);
      detail.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }
}
