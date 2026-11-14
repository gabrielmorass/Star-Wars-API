/* Super Trunfo — fontes de ação.
   ------------------------------------------------------------------
   Uma "fonte de ação" é qualquer coisa que despache `escolher` e `proxima`
   no controlador. Existem três:

     humano  — a view despacha a partir de clique e teclado;
     cpu     — se inscreve no controlador e, quando a vez é dele, despacha
               depois de uma espera;
     remoto  — o jogador do outro aparelho, no modo online: transforma as
               mensagens `acao` recebidas em `despachar`, e envia as ações
               locais com o número de sequência.

   Todas produzem as mesmas duas ações no controlador. A view despacha as
   ações humanas diretamente; computador e remoto observam o controlador e
   reagem de acordo com seu papel.

   Toda a impureza do jogo (o setTimeout, a rede) está fora de regras.js. */

import { escolhaCpu, proximoAEscolher } from "./regras.js";

/** Espera padrão do computador, em ms. `?cpuDelay=0` zera nos testes. */
export const ATRASO_CPU = 800;

/**
 * Fonte "computador": observa o controlador e joga quando é a vez dele.
 *
 * A decisão em si é `escolhaCpu(estado)`, pura — aqui só entra a espera,
 * que existe para o jogo ter ritmo. Depois de revelar, ele espera o dobro
 * antes de passar a rodada, para dar tempo de ler o resultado.
 *
 * @param {object} controlador
 * @param {object} [opcoes]
 * @param {string} [opcoes.jogador="j2"]
 * @param {number} [opcoes.atraso=800]  ms; 0 deixa o jogo instantâneo
 */
export function ligarCpu(controlador, opcoes = {}) {
  const jogador = opcoes.jogador || "j2";
  const atraso = Number.isFinite(opcoes.atraso) ? opcoes.atraso : ATRASO_CPU;

  let temporizador = null;
  let ativo = true;

  function cancelar() {
    if (temporizador !== null) {
      clearTimeout(temporizador);
      temporizador = null;
    }
  }

  function agendar(acao, espera) {
    cancelar();
    temporizador = setTimeout(() => {
      temporizador = null;
      if (!ativo) return;
      try {
        controlador.despachar(acao);
      } catch (_) {
        /* O estado mudou antes do prazo (partida reiniciada, por exemplo):
           a ação deixou de valer e simplesmente não acontece. */
      }
    }, espera);
  }

  function avaliar(estado) {
    if (!ativo) return;
    if (estado.fase === "fim" || estado.vez !== jogador) {
      cancelar();
      return;
    }
    if (estado.fase === "escolhendo") {
      const atributo = escolhaCpu(estado, jogador);
      if (atributo) agendar({ tipo: "escolher", jogador, atributo }, atraso);
      return;
    }
    if (estado.fase === "revelado") {
      agendar({ tipo: "proxima", jogador }, atraso * 2);
    }
  }

  const desinscrever = controlador.assinar(avaliar);
  avaliar(controlador.estado());

  return {
    jogador,
    desligar() {
      ativo = false;
      cancelar();
      desinscrever();
    },
  };
}

/** Versão do protocolo online. Incremente quando o formato das mensagens mudar. */
export const PROTOCOLO = 2;

/**
 * Fonte "remoto": o jogador do outro aparelho.
 *
 * Nos dois sentidos, a ordem é dada por `seq` — o tamanho do `historico`
 * ANTES de aplicar a ação:
 *
 *   - toda ação despachada AQUI (pelo humano deste aparelho) sai como
 *     `{ tipo: "acao", v, seq, acao }`;
 *   - uma `acao` recebida com `seq` igual ao histórico é despachada; menor
 *     é repetida e fica de fora; maior é uma lacuna, e `aoLacuna()` pede
 *     uma sincronização.
 *
 * Só vale ação cujo `jogador` é o do outro aparelho, e `proxima` só de quem
 * escolhe a rodada seguinte — essa regra é do modo online, não de
 * regras.js. Por cima disso, o controlador ainda valida tudo.
 *
 * @param {object}   controlador
 * @param {object}   opcoes
 * @param {string}   opcoes.jogador   id do jogador REMOTO ("j1" | "j2")
 * @param {function} opcoes.enviar    enviar(mensagem) pelo transporte
 * @param {function} [opcoes.aoLacuna] chamada quando chega um `seq` à frente
 */
export function ligarRemoto(controlador, { jogador, enviar, aoLacuna = () => {} }) {
  let ativo = true;
  /* Verdadeiro enquanto esta fonte despacha algo que veio da rede: essas
     ações não voltam para a rede. */
  let aplicandoDeFora = false;

  function aplicarDeFora(acao) {
    aplicandoDeFora = true;
    try {
      controlador.despachar(acao);
    } finally {
      aplicandoDeFora = false;
    }
  }

  const desinscrever = controlador.assinar((estado, acao) => {
    if (!ativo || aplicandoDeFora) return;
    enviar({ tipo: "acao", v: PROTOCOLO, seq: estado.historico.length - 1, acao });
  });

  return {
    jogador,

    /** Trata uma mensagem `acao` vinda do outro aparelho. */
    receber(mensagem) {
      if (!ativo || !mensagem || mensagem.tipo !== "acao") return;
      if (mensagem.v !== PROTOCOLO) {
        console.warn("[trunfo] ação de outra versão do protocolo ignorada:", mensagem);
        return;
      }
      if (!Number.isSafeInteger(mensagem.seq) || mensagem.seq < 0) {
        console.warn("[trunfo] ação sem número de sequência válido ignorada:", mensagem);
        return;
      }

      const estado = controlador.estado();
      const tamanho = estado.historico.length;
      if (mensagem.seq < tamanho) return; /* repetida */
      if (mensagem.seq > tamanho) {
        aoLacuna();
        return;
      }

      const acao = mensagem.acao || {};
      if (acao.jogador !== jogador) {
        console.warn(`[trunfo] ação remota ignorada: veio como "${acao.jogador}", mas o jogador remoto é "${jogador}".`, mensagem);
        return;
      }
      if (acao.tipo === "proxima" && proximoAEscolher(estado) !== jogador) {
        console.warn("[trunfo] ação remota ignorada: só quem escolhe a próxima rodada pode passá-la.", mensagem);
        return;
      }

      try {
        aplicarDeFora(acao);
      } catch (erro) {
        console.warn(`[trunfo] ação remota recusada pelas regras: ${erro.message}`, mensagem);
      }
    },

    /**
     * Aplica, sem reenviar, as ações de um histórico completo que estão
     * além do nosso. Devolve false quando o nosso histórico não é começo do
     * recebido — aí quem chamou precisa reconstruir a partida do zero.
     */
    sincronizar(acoes) {
      const nosso = controlador.estado().historico;
      const prefixo = nosso.every((acao, i) => JSON.stringify(acao) === JSON.stringify(acoes[i]));
      if (!prefixo || acoes.length < nosso.length) return false;
      try {
        acoes.slice(nosso.length).forEach(aplicarDeFora);
      } catch (erro) {
        console.warn(`[trunfo] sincronização recusada pelas regras: ${erro.message}`);
        return false;
      }
      return true;
    },

    desligar() {
      ativo = false;
      desinscrever();
    },
  };
}
