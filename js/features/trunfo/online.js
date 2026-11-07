/* Super Trunfo — sessão do modo online.
   ------------------------------------------------------------------
   Não existe servidor de jogo nem tabela: os dois aparelhos conhecem a
   mesma semente, montam a mesma distribuição e, dali em diante, só as
   AÇÕES viajam. Cada lado roda a mesma máquina de estados (regras.js)
   localmente. Este módulo cuida de tudo o que é de rede e de tempo em
   volta dela:

     sala      — código de 5 letras, semente e clienteId (do anfitrião, j1);
     entrada   — o convidado (j2) manda `ola` com o nome; o anfitrião
                 responde `inicio` com a semente, o hash do baralho e os
                 nomes; o convidado confere hash e versão antes de jogar;
     presença  — sala cheia, oponente que caiu (pausa) e que voltou;
     sincronia — `pedirSync` / `sync` com o histórico inteiro, que o outro
                 lado reconstrói com `reproduzir()`.

   As jogadas em si (seq, repetidas, lacunas, quem pode agir) ficam na
   fonte `remoto`, em jogadores.js. */

import { criarControlador } from "./controlador.js";
import { PROTOCOLO, ligarRemoto } from "./jogadores.js";
import { adversario, criarPartida, hashBaralho, reproduzir } from "./regras.js";
import { criarTransporte } from "./transporte.js";

/** Sem 0, O, 1, I e L: nada que se confunda ao ditar o código. */
export const ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const TAMANHO_CODIGO = 5;

/** Quanto tempo esperar o oponente voltar antes de oferecer "Encerrar partida". */
export const ESPERA_RECONEXAO = 60000;

/** De quanto em quanto tempo o convidado repete o `ola` até receber `inicio`. */
const REPETIR_OLA = 2000;

export const STATUS = {
  conectando: "Conectando…",
  aguardando: "Aguardando oponente…",
  conectado: "Conectado",
  desconectado: "Desconectado",
};

export const ERRO_BARALHO =
  "Os dois aparelhos carregaram baralhos diferentes. Recarreguem a página e tentem de novo.";
export const ERRO_SALA_CHEIA = "Esta sala já está cheia.";

/* ---------------- identificadores ---------------- */

function aleatorios(quantos) {
  return crypto.getRandomValues(new Uint32Array(quantos));
}

export function gerarCodigo() {
  return Array.from(aleatorios(TAMANHO_CODIGO), (n) => ALFABETO_CODIGO[n % ALFABETO_CODIGO.length]).join("");
}

export function gerarSeed() {
  return aleatorios(1)[0];
}

/** `crypto.randomUUID` só existe em contexto seguro; num IP da rede local, sem https, cai no plano B. */
export function gerarClienteId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(aleatorios(4), (n) => n.toString(16).padStart(8, "0")).join("-");
}

/** " ab c2d " → "ABC2D": sem espaços e sem diferença de caixa. */
export function normalizarCodigo(texto) {
  return String(texto || "").replace(/\s+/g, "").toUpperCase();
}

export function codigoValido(codigo) {
  return (
    codigo.length === TAMANHO_CODIGO &&
    [...codigo].every((letra) => ALFABETO_CODIGO.includes(letra))
  );
}

/* ---------------- sessão guardada (recarregar a página) ---------------- */

const CHAVE_SESSAO = "codex-estelar:trunfo-online";

export function lerSessaoSalva() {
  try {
    const salvo = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO) || "null");
    if (salvo && salvo.codigoSala && salvo.clienteId && (salvo.papel === "j1" || salvo.papel === "j2")) {
      return salvo;
    }
  } catch (_) {
    /* sessionStorage indisponível ou conteúdo estragado: sem retomada */
  }
  return null;
}

export function salvarSessao({ codigoSala, clienteId, papel }) {
  try {
    sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify({ codigoSala, clienteId, papel }));
  } catch (_) {
    /* sem sessionStorage a partida funciona; só não sobrevive a um recarregamento */
  }
}

export function limparSessao() {
  try {
    sessionStorage.removeItem(CHAVE_SESSAO);
  } catch (_) {
    /* nada a limpar */
  }
}

/* ---------------- sessão ---------------- */

/**
 * @param {object}   cfg
 * @param {string}   cfg.transporte   "supabase" | "aba" | "fake"
 * @param {string}   cfg.papel        "j1" (anfitrião) | "j2" (convidado)
 * @param {string}   cfg.codigoSala
 * @param {string}   cfg.clienteId
 * @param {string}   cfg.nome         nome do jogador deste aparelho
 * @param {object[]} cfg.baralho      saída de montarBaralho()
 * @param {number}   [cfg.seed]       só o anfitrião usa; sem ela, sorteia
 * @param {boolean}  [cfg.retomando]  voltou depois de recarregar a página
 * @param {function} cfg.aoEvento     aoEvento({ tipo, ... }) — ver `emitir`
 */
export function criarSessaoOnline(cfg) {
  const { papel, codigoSala, clienteId, baralho, aoEvento } = cfg;
  const nome = cfg.nome || (papel === "j1" ? "Jogador 1" : "Jogador 2");
  const meuHash = hashBaralho(baralho);
  const transporte = criarTransporte(cfg.transporte);

  let controlador = null;
  let remoto = null;
  let configPartida = null;
  let oponenteId = null;
  let oponentePresente = false;
  let pausado = false;
  let encerrada = false;
  let semConexao = false;
  let temporizadorPausa = null;
  let temporizadorOla = null;

  function emitir(evento) {
    if (!encerrada) aoEvento(evento);
  }

  function status(chave) {
    emitir({ tipo: "status", texto: STATUS[chave] });
  }

  function enviar(mensagem) {
    if (!encerrada) transporte.enviar(mensagem);
  }

  function pedirSync() {
    enviar({ tipo: "pedirSync", v: PROTOCOLO });
  }

  function nomeDoOponente() {
    const estado = controlador && controlador.estado();
    return estado ? estado.jogadores[adversario(papel)].nome : "O oponente";
  }

  /* ---- começar / reconstruir a partida ---- */

  function comecar(estado) {
    if (remoto) remoto.desligar();
    pararOla();
    controlador = criarControlador(estado);
    remoto = ligarRemoto(controlador, { jogador: adversario(papel), enviar, aoLacuna: pedirSync });
    status(semConexao ? "desconectado" : "conectado");
    emitir({ tipo: "partida", controlador });
  }

  function falhar(mensagem) {
    emitir({ tipo: "erro", mensagem });
    sair();
  }

  /* ---- convidado: `ola` até o anfitrião responder ---- */

  function mandarOla() {
    enviar({ tipo: "ola", v: PROTOCOLO, nome });
  }

  function comecarOla() {
    if (temporizadorOla !== null || controlador) return;
    mandarOla();
    temporizadorOla = setInterval(mandarOla, REPETIR_OLA);
  }

  function pararOla() {
    if (temporizadorOla !== null) clearInterval(temporizadorOla);
    temporizadorOla = null;
  }

  /* ---- pausa por desconexão ---- */

  function pausar() {
    if (pausado) return;
    pausado = true;
    status("desconectado");
    emitir({ tipo: "pausa", nome: nomeDoOponente() });
    temporizadorPausa = setTimeout(() => {
      temporizadorPausa = null;
      emitir({ tipo: "podeEncerrar" });
    }, ESPERA_RECONEXAO);
  }

  function retomar() {
    if (!pausado) return;
    pausado = false;
    if (temporizadorPausa !== null) clearTimeout(temporizadorPausa);
    temporizadorPausa = null;
    emitir({ tipo: "retomada" });
  }

  /* ---- presença ---- */

  function aoPresenca(lista) {
    if (encerrada) return;
    const unicos = [...new Map(lista.map((c) => [c.clienteId, c])).values()];

    if (unicos.length > 2) {
      /* Sala cheia: sai quem chegou por último (desempate pelo id). */
      const ultimo = unicos
        .slice()
        .sort((a, b) => a.entrouEm - b.entrouEm || String(a.clienteId).localeCompare(String(b.clienteId)))
        .pop();
      if (ultimo.clienteId === clienteId) {
        falhar(ERRO_SALA_CHEIA);
        return;
      }
    }

    const outros = unicos
      .filter((c) => c.clienteId !== clienteId)
      .sort((a, b) => a.entrouEm - b.entrouEm);
    if (oponenteId === null && outros.length > 0) oponenteId = outros[0].clienteId;

    const estavaPresente = oponentePresente;
    oponentePresente = outros.some((c) => c.clienteId === oponenteId);

    if (!oponentePresente) {
      const emJogo = controlador && controlador.estado().fase !== "fim";
      if (emJogo && estavaPresente) pausar();
      else if (!controlador) status("aguardando");
      return;
    }

    retomar();
    if (!semConexao) status("conectado");
    if (!controlador) {
      if (papel === "j2") comecarOla();
      if (cfg.retomando && !estavaPresente) pedirSync();
    }
  }

  /* ---- mensagens ---- */

  function enviarSync() {
    if (!controlador) return;
    enviar({
      tipo: "sync",
      v: PROTOCOLO,
      seed: configPartida.seed,
      nomes: configPartida.nomes,
      hashBaralho: meuHash,
      acoes: controlador.estado().historico,
    });
  }

  function aoOla(mensagem) {
    if (papel !== "j1") return;
    if (!controlador) {
      const seed = Number.isFinite(cfg.seed) ? cfg.seed >>> 0 : gerarSeed();
      const nomes = { j1: nome, j2: String(mensagem.nome || "").trim().slice(0, 24) || "Jogador 2" };
      configPartida = { baralho, seed, modo: "local", nomes };
      enviar({ tipo: "inicio", v: PROTOCOLO, seed, hashBaralho: meuHash, nomes });
      comecar(criarPartida(configPartida));
      return;
    }
    /* O convidado ainda não tem a partida: reenviar o começo, ou o histórico. */
    if (controlador.estado().historico.length === 0) {
      enviar({ tipo: "inicio", v: PROTOCOLO, seed: configPartida.seed, hashBaralho: meuHash, nomes: configPartida.nomes });
    } else {
      enviarSync();
    }
  }

  function aoInicio(mensagem) {
    if (papel !== "j2" || controlador) return;
    if (mensagem.v !== PROTOCOLO || mensagem.hashBaralho !== meuHash) {
      falhar(ERRO_BARALHO);
      return;
    }
    configPartida = { baralho, seed: mensagem.seed, modo: "local", nomes: mensagem.nomes };
    comecar(criarPartida(configPartida));
  }

  function aoSync(mensagem) {
    if (mensagem.hashBaralho !== undefined && mensagem.hashBaralho !== meuHash) {
      falhar(ERRO_BARALHO);
      return;
    }
    const acoes = Array.isArray(mensagem.acoes) ? mensagem.acoes : [];
    if (controlador && remoto.sincronizar(acoes)) return;
    if (controlador && acoes.length < controlador.estado().historico.length) return; /* estamos à frente */

    try {
      configPartida = { baralho, seed: mensagem.seed, modo: "local", nomes: mensagem.nomes };
      const estado = reproduzir(configPartida, acoes);
      if (estado.hashBaralho !== meuHash) {
        falhar(ERRO_BARALHO);
        return;
      }
      comecar(estado);
    } catch (erro) {
      console.warn("[trunfo] sincronização impossível:", erro);
      falhar(`Não foi possível sincronizar a partida. (${erro.message})`);
    }
  }

  function aoMensagem(mensagem) {
    if (encerrada || !mensagem || typeof mensagem !== "object") return;
    if (mensagem.tipo === "inicio") return aoInicio(mensagem);
    if (mensagem.v !== PROTOCOLO) {
      console.warn("[trunfo] mensagem de outra versão do protocolo ignorada:", mensagem);
      return;
    }
    if (mensagem.tipo === "ola") return aoOla(mensagem);
    if (mensagem.tipo === "sync") return aoSync(mensagem);
    if (mensagem.tipo === "pedirSync") return enviarSync();
    if (mensagem.tipo === "acao") {
      if (remoto) remoto.receber(mensagem);
      else pedirSync();
    }
  }

  /* ---- conexão do próprio aparelho ---- */

  function aoEstado(estadoConexao) {
    if (estadoConexao === "desconectado") {
      semConexao = true;
      status("desconectado");
      return;
    }
    if (semConexao) {
      semConexao = false;
      status(oponentePresente ? "conectado" : controlador ? "desconectado" : "aguardando");
      /* Pode ter perdido jogadas enquanto estava fora. */
      if (controlador) pedirSync();
    }
  }

  /* ---- ciclo de vida ---- */

  async function conectar() {
    status("conectando");
    transporte.aoMensagem(aoMensagem);
    transporte.aoPresenca(aoPresenca);
    if (typeof transporte.aoEstado === "function") transporte.aoEstado(aoEstado);
    try {
      await transporte.conectar(codigoSala, clienteId);
    } catch (erro) {
      falhar(`Não foi possível conectar. (${erro.message})`);
      return;
    }
    if (encerrada) return;
    if (!oponentePresente && !controlador) status("aguardando");
    if (cfg.retomando) pedirSync();
  }

  async function sair() {
    if (encerrada) return;
    encerrada = true;
    pararOla();
    if (temporizadorPausa !== null) clearTimeout(temporizadorPausa);
    if (remoto) remoto.desligar();
    try {
      await transporte.sair();
    } catch (erro) {
      console.warn("[trunfo] erro ao sair da sala:", erro);
    }
  }

  return {
    papel,
    codigoSala,
    conectar,
    sair,
    /** Com o oponente fora, nenhuma jogada local vale. */
    pausado: () => pausado,
    controlador: () => controlador,
  };
}
