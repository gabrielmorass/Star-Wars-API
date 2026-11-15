/* Indicador de status do BFF no Hub — Gabriel (Bloco A).
   ------------------------------------------------------------------
   Mostra, na própria interface, se o backend está de pé e se o cache
   Redis está conectado. Existe por dois motivos:

   1. Na arguição, é o jeito mais curto de mostrar que o front fala com
      o BFF e que o BFF fala com o Redis — os dois saltos de comunicação
      entre containers que o enunciado pede (critério 8), visíveis sem
      abrir terminal.
   2. No dia a dia, distingue "a SWAPI está fora" de "o nosso backend
      está fora", que são erros com causas bem diferentes.

   Regra de ouro: NUNCA quebrar o Hub. Qualquer falha de rede, timeout
   ou resposta estranha cai no estado "desconhecido" (cinza) e o resto
   da página segue igual. O indicador é informação, não dependência. */

import { API_BASE } from "../../config.js";

// Timeout curto de propósito: o indicador não pode atrasar a pintura do
// Hub. Se o backend não responde em 2s, para o usuário ele está fora.
const TIMEOUT_MS = 2000;

const ESTADOS = {
  ok:           { classe: "status-ok",    texto: "BFF no ar",            titulo: "O backend respondeu e o cache Redis está conectado." },
  semCache:     { classe: "status-aviso", texto: "BFF sem cache",        titulo: "O backend respondeu, mas o Redis não está acessível. As telas funcionam, buscando direto na SWAPI." },
  cacheOff:     { classe: "status-aviso", texto: "BFF sem Redis",        titulo: "O backend está no ar com o cache desligado (sem REDIS_URL no ambiente)." },
  fora:         { classe: "status-erro",  texto: "BFF fora do ar",       titulo: "Não houve resposta do backend. Fora do compose isso é esperado: o /api só existe atrás do nginx." },
  desconhecido: { classe: "status-off",   texto: "status indisponível",  titulo: "Não foi possível determinar o estado do backend." },
};

/* Consulta /api/health e traduz a resposta em um dos estados acima.
   Não lança: o pior caso devolve "fora" ou "desconhecido". */
export async function consultarSaude(buscar = fetch) {
  const corte = new AbortController();
  const relogio = setTimeout(() => corte.abort(), TIMEOUT_MS);
  try {
    const resposta = await buscar(`${API_BASE}/health`, { signal: corte.signal });
    if (!resposta.ok) return ESTADOS.fora;

    const corpo = await resposta.json();
    if (corpo?.status !== "ok") return ESTADOS.fora;

    if (corpo.cache === "conectado") return ESTADOS.ok;
    if (corpo.cache === "indisponivel") return ESTADOS.semCache;
    if (corpo.cache === "desligado") return ESTADOS.cacheOff;

    // Backend respondeu ok, mas num formato que não conhecemos: trata como
    // no ar, sem afirmar nada sobre o cache.
    return ESTADOS.cacheOff;
  } catch (erro) {
    // AbortError (timeout) e falha de rede caem aqui. Os dois significam,
    // para quem está olhando a tela, que o backend não respondeu.
    return erro?.name === "AbortError" ? ESTADOS.fora : ESTADOS.desconhecido;
  } finally {
    clearTimeout(relogio);
  }
}

/* Monta o indicador dentro do elemento recebido e dispara a consulta.
   Devolve a promessa para quem quiser esperar (os testes esperam). */
export function montarStatus(alvo, buscar = fetch) {
  if (!alvo) return Promise.resolve(null);

  // Estado inicial neutro: se a consulta nunca terminar, é isto que fica.
  alvo.className = "hub-status status-off";
  alvo.textContent = "verificando o BFF…";

  return consultarSaude(buscar)
    .then((estado) => {
      alvo.className = `hub-status ${estado.classe}`;
      alvo.textContent = estado.texto;
      alvo.title = estado.titulo;
      return estado;
    })
    .catch(() => {
      // Rede de segurança: nem o consultarSaude deveria chegar aqui.
      alvo.className = "hub-status status-off";
      alvo.textContent = ESTADOS.desconhecido.texto;
      return ESTADOS.desconhecido;
    });
}

export { ESTADOS };
