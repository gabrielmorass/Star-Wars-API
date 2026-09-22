/* Super Trunfo — fontes de ação.
   ------------------------------------------------------------------
   Uma "fonte de ação" é qualquer coisa que despache `escolher` e `proxima`
   no controlador. Hoje existem duas:

     humano  — a view despacha a partir de clique e teclado (`ligarHumano`
               só embrulha isso num objeto com a mesma forma das outras,
               para a view não ter um caminho especial);
     cpu     — se inscreve no controlador e, quando a vez é dele, despacha
               depois de uma espera.

   A fase 2 acrescenta `remoto` AQUI, com a mesma forma: recebe o
   controlador, se inscreve, despacha. Nada em `regras.js`, em
   `controlador.js` ou na lógica de jogo da view muda por causa disso —
   é o motivo de o estado ser JSON puro e de as ações serem só duas.

   Toda a impureza do jogo (o setTimeout) está confinada neste arquivo. */

import { escolhaCpu } from "./regras.js";

/** Espera padrão do computador, em ms. `?cpuDelay=0` zera nos testes. */
export const ATRASO_CPU = 800;

/**
 * Fonte "humano": só repassa. Existe para a view tratar as duas fontes
 * pela mesma interface, em vez de chamar `controlador.despachar` direto
 * num caso e a fonte no outro.
 */
export function ligarHumano(controlador, { jogador = "j1" } = {}) {
  return {
    jogador,
    escolher(atributo) {
      return controlador.despachar({ tipo: "escolher", jogador, atributo });
    },
    proxima() {
      return controlador.despachar({ tipo: "proxima", jogador });
    },
    desligar() {},
  };
}

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
