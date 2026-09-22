/* Super Trunfo — controlador da partida.
   ------------------------------------------------------------------
   Guarda o estado atual e é o ÚNICO caminho por onde ele muda: toda ação
   passa por `despachar`, que valida pelas regras puras, troca o estado e
   avisa os inscritos. A view nunca escreve no estado; ela só lê e despacha.

   O contrato é de propósito pequeno (estado / despachar / assinar) porque
   é ele que permite trocar de fonte de ação sem mexer em nada: humano,
   computador e — na fase 2 — remoto usam exatamente estes três métodos. */

import { aplicarAcao } from "./regras.js";

export function criarControlador(estadoInicial) {
  let estado = estadoInicial;
  const inscritos = new Set();

  return {
    /** O estado atual (JSON puro). */
    estado() {
      return estado;
    },

    /**
     * Valida e aplica a ação, avisando os inscritos. Ação inválida propaga
     * o erro de `regras.js` e NÃO altera o estado.
     */
    despachar(acao) {
      estado = aplicarAcao(estado, acao);
      /* Cópia da lista: um inscrito pode se desinscrever durante o aviso. */
      [...inscritos].forEach((ouvinte) => ouvinte(estado, acao));
      return estado;
    },

    /** Inscreve um ouvinte e devolve a função que o desinscreve. */
    assinar(ouvinte) {
      inscritos.add(ouvinte);
      return () => inscritos.delete(ouvinte);
    },
  };
}
