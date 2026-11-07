/* Super Trunfo — view.
   ------------------------------------------------------------------
   Este arquivo só desenha e escuta eventos: quem decide qualquer coisa é
   `regras.js`, e quem guarda o estado é `controlador.js`. A view lê o
   estado e despacha ações — nunca escreve no estado.

   Ela também é o único lugar que lê coisas do mundo: a semente
   (`Date.now()` ou `?seed=`), os parâmetros de depuração e o DOM.

   Contrato de seletores desta view (afirmado pelos testes de interface):
     #trunfo, #trunfo-modo-cpu, #trunfo-modo-local,
     #trunfo-nome-j1, #trunfo-nome-j2,
     #trunfo-carta-j1, #trunfo-carta-j2, .trunfo-verso, .trunfo-nome,
     .trunfo-atributo[data-attr], .trunfo-super,
     #trunfo-placar-j1, #trunfo-placar-j2, #trunfo-empate,
     #trunfo-vez, #trunfo-resultado, #trunfo-proxima,
     #trunfo-passe, #trunfo-pronto, #trunfo-jogar-novamente. */

import { classeDeNave } from "../../core/vocabulario.js";
import { silhuetaDe, svgSilhueta } from "../vehicles/silhuetas.js";
import { criarControlador } from "./controlador.js";
import { ATRASO_CPU, ligarCpu } from "./jogadores.js";
import {
  ATRIBUTOS,
  LIMITE_RODADAS,
  adversario,
  cartaDeTopo,
  criarPartida,
  formatarValor,
  montarBaralho,
} from "./regras.js";

const LADOS = ["j1", "j2"];

function escapar(texto) {
  return String(texto).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

/* ---------------- parâmetros de teste e depuração ----------------
   Os três existem só para os testes e para depurar à mão; o jogo normal
   não depende de nenhum deles (ver README, "Decisões de dados"). */

function numeroDoParametro(params, nome, padrao) {
  const bruto = params.get(nome);
  if (bruto === null || bruto.trim() === "") return padrao;
  const n = Number(bruto);
  return Number.isFinite(n) ? n : padrao;
}

/** "9,10|12,13" → { j1: [9, 10], j2: [12, 13] } */
function lerMaos(bruto) {
  if (!bruto) return null;
  const partes = bruto.split("|");
  if (partes.length !== 2) return null;
  const lista = (texto) =>
    texto
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isFinite(n));
  const j1 = lista(partes[0]);
  const j2 = lista(partes[1]);
  return j1.length && j2.length ? { j1, j2 } : null;
}

function lerParametros() {
  const params = new URLSearchParams(window.location.search);
  return {
    seed: numeroDoParametro(params, "seed", null),
    atrasoCpu: numeroDoParametro(params, "cpuDelay", ATRASO_CPU),
    maos: lerMaos(params.get("maos")),
  };
}

/* ---------------- view ---------------- */

export function renderTrunfoView(container, starships) {
  const baralho = montarBaralho(starships);
  const config = lerParametros();

  /* `?maos=` vale só para a PRIMEIRA partida da sessão: assim um cenário de
     teste pode forçar as mãos e, depois de "Jogar de novo", a distribuição
     volta a ser a normal de 18 × 18. Mesma ideia do uso único de
     `core/nav-intent.js`. */
  let maosForcadas = config.maos;

  let controlador = null;
  let fonteCpu = null;
  let desinscrever = null;

  /* Modo "dois jogadores": quem está com o aparelho na mão agora. */
  let comOAparelho = "j1";
  let coberto = false;

  /* Só move o foco quando o teclado/mouse já está dentro da view — assim a
     navegação por teclado funciona sem roubar o foco de quem acabou de
     chegar pela barra de navegação. */
  let interagiu = false;

  container.innerHTML = `<section id="trunfo" class="trunfo"></section>`;
  const raiz = container.querySelector("#trunfo");

  /* O teclado é tratado no keydown (abaixo). Se, apesar do preventDefault,
     o navegador ainda sintetizar o clique daquele Enter, este sinal o
     descarta — a ação não pode acontecer duas vezes. Ele se apaga no
     próximo microtask, então um clique de verdade nunca é engolido. */
  let cliqueJaTratado = false;

  raiz.addEventListener("click", (evento) => {
    const alvo = evento.target.closest("[data-acao]");
    if (!alvo || alvo.disabled) return;
    if (cliqueJaTratado) return;
    interagiu = true;
    executar(alvo);
  });

  /* Enter e Espaço num controle da view: tratados aqui (com
     preventDefault) para o jogo ser inteiramente operável pelo teclado,
     sem depender do clique sintético do navegador. */
  raiz.addEventListener("keydown", (evento) => {
    if (evento.key !== "Enter" && evento.key !== " ") return;
    const alvo = evento.target.closest("[data-acao]");
    if (!alvo || alvo.disabled) return;
    evento.preventDefault();
    cliqueJaTratado = true;
    Promise.resolve().then(() => {
      cliqueJaTratado = false;
    });
    interagiu = true;
    executar(alvo);
  });

  function executar(alvo) {
    const acao = alvo.dataset.acao;
    if (acao === "modo-cpu") return iniciar("cpu");
    if (acao === "modo-local") return iniciar("local");
    if (acao === "escolher") {
      const estado = controlador.estado();
      if (!escolheNesteAparelho(estado)) return;
      return despachar({ tipo: "escolher", jogador: estado.vez, atributo: alvo.dataset.attr });
    }
    if (acao === "proxima") return despachar({ tipo: "proxima", jogador: controlador.estado().vez });
    if (acao === "pronto") return descobrir();
    if (acao === "novamente") return telaInicial();
  }

  /* Uma ação inválida (clique duplo, botão que sobrou de um estado
     anterior) não deve derrubar a tela: a regra já recusou, e o estado
     continua o que era. */
  function despachar(acao) {
    try {
      controlador.despachar(acao);
    } catch (erro) {
      const resultado = raiz.querySelector("#trunfo-resultado");
      if (resultado) resultado.textContent = erro.message;
    }
  }

  function encerrarPartida() {
    if (fonteCpu) fonteCpu.desligar();
    if (desinscrever) desinscrever();
    fonteCpu = null;
    desinscrever = null;
    controlador = null;
  }

  /* ---------------- tela inicial ---------------- */

  function telaInicial() {
    encerrarPartida();
    coberto = false;
    comOAparelho = "j1";

    raiz.innerHTML = `
      <div class="trunfo-inicio">
        <h2>Super Trunfo</h2>
        <p class="trunfo-intro">
          As 36 naves da SWAPI viram um baralho de 5 atributos. Cada jogador
          recebe 18 cartas, e só a carta do topo entra em jogo: quem venceu a
          rodada anterior escolhe o atributo da próxima.
        </p>
        <div class="trunfo-nomes">
          <label for="trunfo-nome-j1">Jogador 1</label>
          <input type="text" id="trunfo-nome-j1" maxlength="24" autocomplete="off"
                 placeholder="Jogador 1" aria-label="Nome do jogador 1" />
          <label for="trunfo-nome-j2">Jogador 2</label>
          <input type="text" id="trunfo-nome-j2" maxlength="24" autocomplete="off"
                 placeholder="Jogador 2 / Computador" aria-label="Nome do jogador 2" />
        </div>
        <div class="trunfo-modos">
          <button type="button" id="trunfo-modo-cpu" class="trunfo-botao" data-acao="modo-cpu">Contra o computador</button>
          <button type="button" id="trunfo-modo-local" class="trunfo-botao" data-acao="modo-local">Dois jogadores (mesmo aparelho)</button>
        </div>
        <ul class="trunfo-regras">
          <li>No <strong>Hiperpropulsor</strong> ganha o <strong>menor</strong> valor: classe 0,5 é mais rápida que classe 4,0.</li>
          <li>Atributo desconhecido na sua carta não pode ser escolhido; desconhecido na carta do adversário faz você vencer a rodada.</li>
          <li>A <strong>Death Star</strong> é o Super Trunfo e vence tudo — menos um caça estelar, que foi quem a destruiu.</li>
          <li>Empate manda as duas cartas para o monte, e quem vencer a rodada seguinte leva o monte inteiro.</li>
          <li>A partida acaba quando alguém fica com todas as cartas ou depois de ${LIMITE_RODADAS} rodadas.</li>
        </ul>
      </div>
    `;
    focar("#trunfo-modo-cpu");
  }

  /* ---------------- começar uma partida ---------------- */

  function iniciar(modo) {
    const nomes = {
      j1: valorDoCampo("#trunfo-nome-j1"),
      j2: valorDoCampo("#trunfo-nome-j2"),
    };
    /* A semente é lida AQUI, nunca em regras.js. */
    const seed = config.seed === null ? Date.now() >>> 0 : config.seed;

    let inicial;
    try {
      inicial = criarPartida({ baralho, seed, modo, nomes, maos: maosForcadas });
    } catch (erro) {
      raiz.innerHTML = `<p class="state-msg error">Não foi possível começar a partida. (${escapar(erro.message)})</p>`;
      return;
    }
    maosForcadas = null;

    encerrarPartida();
    comOAparelho = "j1";
    coberto = false;

    controlador = criarControlador(inicial);
    desinscrever = controlador.assinar(aoMudarEstado);
    if (modo === "cpu") {
      fonteCpu = ligarCpu(controlador, { jogador: "j2", atraso: config.atrasoCpu });
    }

    montarMesa();
  }

  function valorDoCampo(seletor) {
    const campo = raiz.querySelector(seletor);
    return campo ? campo.value.trim() : "";
  }

  function aoMudarEstado(estado) {
    if (estado.fase === "fim") {
      telaFim(estado);
      return;
    }
    /* Modo "dois jogadores": se quem escolhe agora não é quem está com o
       aparelho, cobre a tela antes de qualquer coisa aparecer. */
    if (estado.modo === "local" && estado.fase === "escolhendo" && estado.vez !== comOAparelho) {
      coberto = true;
    }
    atualizar(estado);
  }

  function descobrir() {
    coberto = false;
    comOAparelho = controlador.estado().vez;
    atualizar(controlador.estado());
  }

  /* ---------------- mesa ---------------- */

  function montarMesa() {
    const estado = controlador.estado();
    raiz.innerHTML = `
      <div class="trunfo-mesa" data-modo="${estado.modo}">
        ${htmlPlacar(estado)}
        <p id="trunfo-vez" class="trunfo-vez"></p>
        <div class="trunfo-cartas">
          <article id="trunfo-carta-j1" class="trunfo-carta"></article>
          <article id="trunfo-carta-j2" class="trunfo-carta"></article>
        </div>
        <div class="trunfo-atributos" id="trunfo-atributos" role="group" aria-label="Atributos da carta em jogo"></div>
        <p id="trunfo-resultado" class="trunfo-resultado" role="status" aria-live="polite"></p>
        <div class="trunfo-acoes">
          <button type="button" id="trunfo-proxima" class="trunfo-botao" data-acao="proxima" hidden>Próxima rodada</button>
        </div>
        <div id="trunfo-passe" class="trunfo-passe" hidden>
          <p class="trunfo-passe-texto"></p>
          <button type="button" id="trunfo-pronto" class="trunfo-botao" data-acao="pronto">Estou pronto</button>
        </div>
      </div>
    `;
    atualizar(estado);
  }

  function htmlPlacar(estado) {
    const lado = (jogador) => `
      <div class="trunfo-placar-lado">
        <span class="trunfo-placar-nome">${escapar(estado.jogadores[jogador].nome)}</span>
        <strong id="trunfo-placar-${jogador}">${estado.jogadores[jogador].mao.length}</strong>
        <span class="trunfo-placar-rotulo">cartas</span>
      </div>`;
    return `
      <div class="trunfo-placar">
        ${lado("j1")}
        <div class="trunfo-placar-monte">
          <span class="trunfo-placar-rotulo">Monte de empate</span>
          <strong id="trunfo-empate">${estado.empate.length}</strong>
        </div>
        ${lado("j2")}
      </div>`;
  }

  /**
   * Redesenha as partes que mudam, sem recriar a mesa — é o que mantém a
   * região `aria-live` do resultado viva entre as rodadas.
   */
  function atualizar(estado) {
    const mesa = raiz.querySelector(".trunfo-mesa");
    if (!mesa) return;

    mesa.classList.toggle("is-coberto", coberto);

    LADOS.forEach((jogador) => {
      raiz.querySelector(`#trunfo-placar-${jogador}`).textContent = String(
        estado.jogadores[jogador].mao.length
      );
    });
    raiz.querySelector("#trunfo-empate").textContent = String(estado.empate.length);

    raiz.querySelector("#trunfo-vez").textContent = textoDaVez(estado);
    raiz.querySelector("#trunfo-resultado").textContent = estado.ultimaRodada
      ? estado.ultimaRodada.motivo
      : "";

    LADOS.forEach((jogador) => {
      const carta = raiz.querySelector(`#trunfo-carta-${jogador}`);
      const visivel = !coberto && cartaVisivel(estado, jogador);
      carta.classList.toggle("trunfo-verso", !visivel);
      carta.classList.toggle("is-vez", estado.fase === "escolhendo" && estado.vez === jogador);
      carta.innerHTML = visivel ? htmlCartaAberta(estado, jogador) : htmlCartaVirada(estado, jogador);
    });

    raiz.querySelector("#trunfo-atributos").innerHTML = coberto ? "" : htmlAtributos(estado);

    const proxima = raiz.querySelector("#trunfo-proxima");
    proxima.hidden = coberto || !humanoPassaARodada(estado);

    const passe = raiz.querySelector("#trunfo-passe");
    passe.hidden = !coberto;
    if (coberto) {
      passe.querySelector(".trunfo-passe-texto").textContent =
        `Passe o aparelho para ${estado.jogadores[estado.vez].nome}`;
    }

    focar(
      coberto
        ? "#trunfo-pronto"
        : estado.fase === "revelado" && humanoPassaARodada(estado)
          ? "#trunfo-proxima"
          : ".trunfo-atributo:not([disabled])"
    );
  }

  /**
   * Quem escolhe agora está com o aparelho? Contra o computador, só quando a
   * vez é do jogador 1: na vez do computador os botões de atributo não podem
   * nem existir — eles mostrariam os valores da carta dele, que está virada,
   * e um clique escolheria por ele.
   */
  function escolheNesteAparelho(estado) {
    if (estado.modo === "cpu") return estado.vez === "j1";
    return true;
  }

  /** No modo contra o computador, ele mesmo passa a rodada que escolheu. */
  function humanoPassaARodada(estado) {
    if (estado.fase !== "revelado") return false;
    return estado.modo === "local" || estado.vez === "j1";
  }

  function cartaVisivel(estado, jogador) {
    if (estado.fase === "revelado") return true;
    if (estado.modo === "cpu") return jogador === "j1";
    return jogador === estado.vez;
  }

  function textoDaVez(estado) {
    const nome = estado.jogadores[estado.vez].nome;
    if (estado.fase === "revelado") {
      const { atributo } = estado.ultimaRodada;
      const regra = ATRIBUTOS.find((a) => a.chave === atributo);
      return `Rodada ${estado.rodada} · ${nome} escolheu ${regra.rotulo}`;
    }
    return `Rodada ${estado.rodada} de ${LIMITE_RODADAS} · Vez de ${nome} — escolha um atributo`;
  }

  /* ---------------- cartas ---------------- */

  function htmlCartaAberta(estado, jogador) {
    const carta = cartaDeTopo(estado, jogador);
    if (!carta) return `<p class="trunfo-carta-vazia">Sem cartas</p>`;

    const revelado = estado.fase === "revelado";
    const disputa = revelado ? estado.ultimaRodada : null;

    const valores = ATRIBUTOS.map((regra) => {
      const valor = carta.valores[regra.chave];
      const emDisputa = disputa && disputa.atributo === regra.chave;
      const classes = ["trunfo-valor"];
      if (emDisputa) classes.push("is-disputa");
      if (emDisputa && disputa.vencedor === jogador) classes.push("is-vencedor");
      if (emDisputa && disputa.vencedor === adversario(jogador)) classes.push("is-perdedor");
      return `
        <div class="${classes.join(" ")}" data-attr="${regra.chave}">
          <dt>${regra.rotulo}</dt>
          <dd>${valor === null ? "Desconhecido" : formatarValor(valor, regra.chave)}</dd>
        </div>`;
    }).join("");

    return `
      <div class="trunfo-carta-topo">
        <span class="trunfo-carta-dono">${escapar(estado.jogadores[jogador].nome)}</span>
        ${carta.superTrunfo ? `<span class="trunfo-super">SUPER TRUNFO</span>` : ""}
      </div>
      <h3 class="trunfo-nome">${escapar(carta.name)}</h3>
      <p class="trunfo-classe">${escapar(classeDeNave(carta.starship_class))}</p>
      <div class="trunfo-arte">${svgSilhueta(silhuetaDe(carta.starship_class), 108)}</div>
      <dl class="trunfo-valores">${valores}</dl>
    `;
  }

  /* A carta virada não traz o nome nem os valores da nave: o dado não pode
     estar no DOM de quem não deveria vê-lo. */
  function htmlCartaVirada(estado, jogador) {
    return `
      <div class="trunfo-carta-topo">
        <span class="trunfo-carta-dono">${escapar(estado.jogadores[jogador].nome)}</span>
      </div>
      <div class="trunfo-arte trunfo-arte--verso" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="108" height="108" fill="none" stroke="currentColor"
             stroke-width="1.5" focusable="false">
          <rect x="6" y="6" width="52" height="52" rx="4"/>
          <rect x="14" y="14" width="36" height="36" rx="2"/>
          <circle cx="32" cy="32" r="10"/>
          <path d="M32 12v8M32 44v8M12 32h8M44 32h8"/>
        </svg>
      </div>
      <p class="trunfo-carta-oculta">Carta virada</p>
    `;
  }

  function htmlAtributos(estado) {
    const carta = cartaDeTopo(estado, estado.vez);
    if (!carta) return "";
    const revelado = estado.fase === "revelado";
    if (!revelado && !escolheNesteAparelho(estado)) return "";

    return ATRIBUTOS.map((regra) => {
      const valor = carta.valores[regra.chave];
      const desconhecido = valor === null;
      const escolhido = revelado && estado.ultimaRodada.atributo === regra.chave;
      const classes = ["trunfo-atributo"];
      if (escolhido) classes.push("is-escolhido");
      if (desconhecido) classes.push("is-desconhecido");
      return `
        <button type="button" class="${classes.join(" ")}" data-acao="escolher"
          data-attr="${regra.chave}" ${desconhecido || revelado ? "disabled" : ""}
          aria-label="${regra.rotulo}: ${desconhecido ? "Desconhecido" : formatarValor(valor, regra.chave)}">
          <span class="trunfo-atributo-rotulo">${regra.rotulo}</span>
          <span class="trunfo-atributo-valor">${desconhecido ? "Desconhecido" : formatarValor(valor, regra.chave)}</span>
        </button>`;
    }).join("");
  }

  /* ---------------- fim de partida ---------------- */

  function telaFim(estado) {
    const titulo =
      estado.vencedor === null
        ? "Empate"
        : `${escapar(estado.jogadores[estado.vencedor].nome)} venceu`;

    raiz.innerHTML = `
      <div class="trunfo-fim">
        <h2>Fim da partida</h2>
        <p class="trunfo-fim-titulo">${titulo}</p>
        ${htmlPlacar(estado)}
        <p id="trunfo-resultado" class="trunfo-resultado" role="status" aria-live="polite">${escapar(estado.motivoFim || "")}</p>
        <button type="button" id="trunfo-jogar-novamente" class="trunfo-botao" data-acao="novamente">Jogar de novo</button>
      </div>
    `;
    focar("#trunfo-jogar-novamente");
  }

  /* ---------------- foco ---------------- */

  function focar(seletor) {
    if (!interagiu) return;
    const alvo = raiz.querySelector(seletor);
    if (alvo) alvo.focus();
  }

  telaInicial();
}
