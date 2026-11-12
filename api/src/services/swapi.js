// Cliente da SWAPI (swapi.info) — Codex Estelar · Bloco B (Eduardo)
//
// UMA função só, de propósito: buscar(caminho). É o único ponto do BFF que
// fala com a internet. A Samile (Bloco D) envolve esta função com o cache
// Redis em services/cache.js, sem precisar mexer em nenhuma rota.
//
// Contrato:
//   resolve → o JSON da SWAPI exatamente como veio (sem reescrever nada)
//   rejeita → ErroSwapi com .status 404 (não existe) ou 502 (SWAPI fora,
//             timeout ou resposta inválida). O tratador de erros do app.js
//             transforma isso na resposta JSON.

const BASE_PADRAO = 'https://swapi.info/api';
const TIMEOUT_PADRAO_MS = 8000;

class ErroSwapi extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.name = 'ErroSwapi';
    this.status = status;
  }
}

// Lidos a cada chamada, e não no carregamento do módulo, para que os testes
// (Bloco C) possam trocar SWAPI_BASE_URL/SWAPI_TIMEOUT_MS sem recarregar nada.
function baseUrl() {
  return (process.env.SWAPI_BASE_URL || BASE_PADRAO).replace(/\/+$/, '');
}

function timeoutMs() {
  return Number(process.env.SWAPI_TIMEOUT_MS) || TIMEOUT_PADRAO_MS;
}

/**
 * Busca um recurso da SWAPI.
 *   buscar('people')    → array com todos os personagens
 *   buscar('people/1')  → objeto do personagem 1
 */
async function buscar(caminho) {
  const url = `${baseUrl()}/${String(caminho).replace(/^\/+/, '')}`;

  let resposta;
  try {
    // fetch nativo do Node 20: nenhuma dependência extra (axios etc.).
    // Sem timeout, uma SWAPI travada prenderia a requisição do usuário
    // indefinidamente; AbortSignal.timeout corta e vira 502.
    resposta = await fetch(url, { signal: AbortSignal.timeout(timeoutMs()) });
  } catch (e) {
    const motivo = e.name === 'TimeoutError' ? 'não respondeu a tempo' : 'está indisponível';
    throw new ErroSwapi(502, `SWAPI ${motivo}`);
  }

  // A swapi.info devolve uma página HTML no 404. Por isso o status é
  // decidido aqui, antes de tentar ler JSON.
  if (resposta.status === 404) {
    throw new ErroSwapi(404, 'Recurso não encontrado');
  }
  if (!resposta.ok) {
    throw new ErroSwapi(502, `SWAPI respondeu HTTP ${resposta.status}`);
  }

  try {
    return await resposta.json();
  } catch {
    throw new ErroSwapi(502, 'SWAPI devolveu uma resposta que não é JSON');
  }
}

module.exports = { buscar, ErroSwapi };
