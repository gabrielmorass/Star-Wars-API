/* Super Trunfo — transportes do modo online.
   ------------------------------------------------------------------
   Um transporte só leva mensagens JSON de um aparelho para o outro e diz
   quem está na sala. Ele não sabe nada de jogo: o protocolo mora em
   `online.js`, e as regras em `regras.js`. Todos têm a mesma interface:

     conectar(codigoSala, clienteId) → Promise<void>
     enviar(mensagem)                  // JSON puro
     aoMensagem(callback)              // callback(mensagem)
     aoPresenca(callback)              // callback([{ clienteId, entrouEm }])
     sair() → Promise<void>

   e, opcionalmente, aoEstado(callback) — callback("conectado" |
   "desconectado") quando a conexão do PRÓPRIO aparelho cai ou volta.

   Três implementações:

     supabase — o padrão quando js/config.js tem URL e anon key: Realtime
                do Supabase, canal `trunfo:<CODIGO>`, broadcast + presença.
     aba      — `?transporte=aba`: BroadcastChannel entre duas abas do
                mesmo navegador. Para desenvolver e demonstrar sem Supabase.
     fake     — `?transporte=fake`: um oponente roteirizado, para os testes
                automatizados (ver `criarTransporteFake`). */

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../../config.js";

/** Versão exata do supabase-js. O caminho UMD foi conferido para ela. */
export const VERSAO_SUPABASE = "2.118.0";
export const CDN_SUPABASE = `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${VERSAO_SUPABASE}/dist/umd/supabase.min.js`;

/** O Supabase está configurado em js/config.js? */
export function supabaseConfigurado() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Nome do transporte que esta página usaria: o de `?transporte=`, ou
 * "supabase" quando ele está configurado, ou null (modo online indisponível).
 */
export function transporteEscolhido(search = window.location.search) {
  const pedido = new URLSearchParams(search).get("transporte");
  if (pedido) return pedido.trim().toLowerCase();
  return supabaseConfigurado() ? "supabase" : null;
}

export function criarTransporte(nome) {
  if (nome === "supabase") return criarTransporteSupabase();
  if (nome === "aba") return criarTransporteAba();
  if (nome === "fake") return criarTransporteFake();
  throw new Error(`Transporte desconhecido: "${nome}". Use "supabase", "aba" ou "fake".`);
}

/** Lista de ouvintes com aviso protegido: um ouvinte com erro não cala os outros. */
function ouvintes() {
  const lista = [];
  return {
    add(fn) {
      lista.push(fn);
    },
    emitir(...args) {
      lista.slice().forEach((fn) => {
        try {
          fn(...args);
        } catch (erro) {
          console.error("[trunfo] erro num ouvinte do transporte:", erro);
        }
      });
    },
  };
}

/* ---------------- supabase ---------------- */

let promessaSupabase = null;

/** Injeta o supabase-js só quando alguém escolhe jogar online (mesmo padrão do Three.js em vehicles/hangar.js). */
function carregarSupabase() {
  if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
  if (promessaSupabase) return promessaSupabase;

  promessaSupabase = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = CDN_SUPABASE;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.addEventListener("load", () =>
      window.supabase && window.supabase.createClient
        ? resolve(window.supabase)
        : reject(new Error("supabase-js ausente"))
    );
    s.addEventListener("error", () => reject(new Error("jsDelivr indisponível")));
    document.head.appendChild(s);
  }).catch((erro) => {
    /* zera para uma próxima tentativa poder recomeçar */
    promessaSupabase = null;
    throw erro;
  });

  return promessaSupabase;
}

function criarTransporteSupabase() {
  const mensagens = ouvintes();
  const presencas = ouvintes();
  const estados = ouvintes();
  let cliente = null;
  let canal = null;

  return {
    nome: "supabase",

    async conectar(codigoSala, clienteId) {
      if (!supabaseConfigurado()) {
        throw new Error("O Supabase não está configurado em js/config.js.");
      }
      const lib = await carregarSupabase();
      cliente = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      canal = cliente.channel(`trunfo:${codigoSala}`, {
        config: {
          broadcast: { self: false, ack: true },
          presence: { key: clienteId },
        },
      });

      canal.on("broadcast", { event: "trunfo" }, ({ payload }) => mensagens.emitir(payload));
      canal.on("presence", { event: "sync" }, () => {
        const estado = canal.presenceState();
        const lista = Object.keys(estado).map((id) => ({
          clienteId: id,
          entrouEm: Math.min(...estado[id].map((meta) => Number(meta.entrouEm) || Infinity)),
        }));
        presencas.emitir(lista);
      });

      /* `entrouEm` é fixado na primeira entrada: numa reconexão o aparelho
         volta com a mesma hora, e não passa a ser "o último a chegar". */
      const entrouEm = Date.now();
      await new Promise((resolve, reject) => {
        let primeira = true;
        canal.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await canal.track({ clienteId, entrouEm });
            estados.emitir("conectado");
            if (primeira) {
              primeira = false;
              resolve();
            }
            return;
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            if (primeira) {
              primeira = false;
              reject(new Error("Não foi possível entrar no canal do Realtime."));
              return;
            }
            estados.emitir("desconectado");
          }
        });
      });
    },

    enviar(mensagem) {
      if (!canal) return;
      canal
        .send({ type: "broadcast", event: "trunfo", payload: mensagem })
        .then((resposta) => {
          if (resposta !== "ok") console.warn("[trunfo] mensagem sem confirmação:", resposta, mensagem);
        })
        .catch((erro) => console.warn("[trunfo] falha ao enviar:", erro));
    },

    aoMensagem: mensagens.add,
    aoPresenca: presencas.add,
    aoEstado: estados.add,

    async sair() {
      if (!canal) return;
      const saindo = canal;
      canal = null;
      try {
        await saindo.untrack();
      } catch (_) {
        /* já estava fora */
      }
      await cliente.removeChannel(saindo);
    },
  };
}

/* ---------------- aba (BroadcastChannel) ----------------
   Presença simulada por pulsos: cada aba anuncia a si mesma a cada
   PULSO ms, e some da lista se ficar EXPIRA ms sem pulsar (aba fechada à
   força). Ao sair de propósito, ela avisa na hora. */

const PULSO = 1500;
const EXPIRA = 5000;

function criarTransporteAba() {
  const mensagens = ouvintes();
  const presencas = ouvintes();
  let canal = null;
  let eu = null;
  let intervalo = null;
  const membros = new Map(); /* clienteId → { entrouEm, visto } */

  function avisarPresenca() {
    presencas.emitir(
      [...membros.entries()].map(([clienteId, m]) => ({ clienteId, entrouEm: m.entrouEm }))
    );
  }

  function pulsar() {
    canal.postMessage({ presenca: "pulso", clienteId: eu.clienteId, entrouEm: eu.entrouEm });
  }

  function aoSairDaPagina() {
    if (canal) canal.postMessage({ presenca: "saiu", clienteId: eu.clienteId });
  }

  return {
    nome: "aba",

    async conectar(codigoSala, clienteId) {
      if (typeof BroadcastChannel === "undefined") {
        throw new Error("Este navegador não tem BroadcastChannel.");
      }
      eu = { clienteId, entrouEm: Date.now() };
      membros.set(clienteId, { entrouEm: eu.entrouEm, visto: Date.now() });
      canal = new BroadcastChannel(`trunfo:${codigoSala}`);

      canal.onmessage = ({ data }) => {
        if (!data) return;
        if (data.presenca === "pulso") {
          const novo = !membros.has(data.clienteId);
          membros.set(data.clienteId, { entrouEm: data.entrouEm, visto: Date.now() });
          if (novo) {
            pulsar(); /* responde na hora, para o recém-chegado não esperar um pulso inteiro */
            avisarPresenca();
          }
          return;
        }
        if (data.presenca === "saiu") {
          if (membros.delete(data.clienteId)) avisarPresenca();
          return;
        }
        if (data.mensagem) mensagens.emitir(data.mensagem);
      };

      intervalo = setInterval(() => {
        pulsar();
        const agora = Date.now();
        let mudou = false;
        membros.forEach((m, id) => {
          if (id !== eu.clienteId && agora - m.visto > EXPIRA) {
            membros.delete(id);
            mudou = true;
          }
        });
        if (mudou) avisarPresenca();
      }, PULSO);

      window.addEventListener("pagehide", aoSairDaPagina);
      pulsar();
      avisarPresenca();
    },

    enviar(mensagem) {
      if (canal) canal.postMessage({ mensagem });
    },

    aoMensagem: mensagens.add,
    aoPresenca: presencas.add,

    async sair() {
      if (!canal) return;
      aoSairDaPagina();
      clearInterval(intervalo);
      window.removeEventListener("pagehide", aoSairDaPagina);
      canal.close();
      canal = null;
      membros.clear();
    },
  };
}

/* ---------------- fake (testes) ----------------
   O teste injeta, ANTES de a página carregar (no `onBeforeLoad` do
   cy.visit), um objeto em `window.__trunfoFake`:

     window.__trunfoFake = {
       oponente: { clienteId: "oponente", entrouEm: 1 },   // opcional
       roteiro: [
         { apos: 0, presenca: "entrar" },
         { quando: { tipo: "ola" }, mensagem: { tipo: "inicio", … } },
         { quando: { tipo: "acao", seq: 0 }, apos: 50, mensagem: { … } },
         { apos: 100, presenca: [{ clienteId: "x", entrouEm: 2 }] },
       ],
     }

   Cada passo do roteiro dispara UMA vez:
     - `apos: ms`       — tantos ms depois de conectar (ou depois do gatilho);
     - `quando: {…}`    — quando o cliente local ENVIAR uma mensagem que
                          contenha esses campos (comparação por subconjunto);
   e faz uma destas coisas:
     - `mensagem: {…}`  — o "oponente" envia essa mensagem;
     - `presenca: "entrar" | "sair" | [lista]` — o oponente entra ou sai da
       sala, ou a lista de OUTROS clientes vira exatamente essa (o próprio
       cliente local está sempre nela).

   O transporte grava tudo o que o cliente local envia em
   `window.__trunfoFake.enviadas` e expõe, depois de conectar,
   `injetar(mensagem)` e `presenca(listaOuAcao)` para o teste agir na hora.

   Nada disso existe sem `?transporte=fake`: o objeto só é lido aqui. */

/** `parcial` está contido em `inteiro`? (objetos comparados campo a campo) */
function contem(inteiro, parcial) {
  if (parcial === null || typeof parcial !== "object") return inteiro === parcial;
  if (inteiro === null || typeof inteiro !== "object") return false;
  return Object.keys(parcial).every((chave) => contem(inteiro[chave], parcial[chave]));
}

function criarTransporteFake() {
  const mensagens = ouvintes();
  const presencas = ouvintes();
  const config = window.__trunfoFake || (window.__trunfoFake = {});
  const oponente = config.oponente || { clienteId: "oponente-fake", entrouEm: 1 };
  const temporizadores = new Set();
  let eu = null;
  let outros = [];
  let conectado = false;
  let pendentes = [];

  config.enviadas = config.enviadas || [];

  function avisarPresenca() {
    presencas.emitir([eu, ...outros].map((c) => ({ ...c })));
  }

  function mudarPresenca(acao) {
    if (acao === "entrar") {
      if (!outros.some((c) => c.clienteId === oponente.clienteId)) outros.push({ ...oponente });
    } else if (acao === "sair") {
      outros = outros.filter((c) => c.clienteId !== oponente.clienteId);
    } else if (Array.isArray(acao)) {
      outros = acao.map((c) => ({ ...c }));
    }
    avisarPresenca();
  }

  function entregar(mensagem) {
    /* Cópia por JSON: o cliente recebe o que receberia da rede, nunca a
       mesma referência que o teste guarda. */
    mensagens.emitir(JSON.parse(JSON.stringify(mensagem)));
  }

  function executarPasso(passo) {
    if (!conectado) return;
    if (passo.avisar) avisarPresenca();
    if (passo.presenca !== undefined) mudarPresenca(passo.presenca);
    if (passo.mensagem) entregar(passo.mensagem);
  }

  function agendar(passo, espera) {
    const t = setTimeout(() => {
      temporizadores.delete(t);
      executarPasso(passo);
    }, Math.max(0, Number(espera) || 0));
    temporizadores.add(t);
  }

  return {
    nome: "fake",

    async conectar(codigoSala, clienteId) {
      eu = { clienteId, entrouEm: Date.now() };
      conectado = true;
      config.codigoSala = codigoSala;
      config.clienteId = clienteId;
      config.injetar = (mensagem) => entregar(mensagem);
      config.presenca = (acao) => mudarPresenca(acao);

      /* A própria presença chega depois de conectar, como no Realtime. */
      agendar({ avisar: true }, 0);

      const roteiro = Array.isArray(config.roteiro) ? config.roteiro : [];
      pendentes = roteiro.filter((passo) => passo.quando);
      roteiro.filter((passo) => !passo.quando).forEach((passo) => agendar(passo, passo.apos));
    },

    enviar(mensagem) {
      const copia = JSON.parse(JSON.stringify(mensagem));
      config.enviadas.push(copia);
      const disparados = pendentes.filter((passo) => contem(copia, passo.quando));
      pendentes = pendentes.filter((passo) => !disparados.includes(passo));
      disparados.forEach((passo) => agendar(passo, passo.apos));
    },

    aoMensagem: mensagens.add,
    aoPresenca: presencas.add,

    async sair() {
      conectado = false;
      temporizadores.forEach(clearTimeout);
      temporizadores.clear();
      config.saiu = true;
    },
  };
}
