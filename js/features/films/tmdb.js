/* Pôster oficial do TMDB — só como fundo do cabeçalho do modal.
   ------------------------------------------------------------------
   A arte da grade continua sendo a procedural de poster-art.js; isto aqui
   é enfeite do cabeçalho e nada mais depende dele. Por isso todo caminho
   de erro devolve `null` em silêncio: sem chave, sem rede, sem resultado
   ou com resposta estranha, o cabeçalho fica exatamente como já é hoje.

   O cache é em sessionStorage: são 6 filmes que não mudam durante a sessão,
   e assim reabrir o mesmo modal não gasta uma requisição. */
import { TMDB_API_KEY, TMDB_BASE, TMDB_IMG } from "../../config.js";

const CHAVE_CACHE = "codex-estelar:tmdb-poster";
const TEMPO_LIMITE = 4000;

/* sessionStorage pode simplesmente não existir (modo privado, storage
   bloqueado). Nesses casos o cache vira um Map em memória e segue o jogo. */
const memoria = new Map();

function lerCache() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_CACHE) || "{}");
  } catch {
    return null;
  }
}

function gravarCache(titulo, valor) {
  memoria.set(titulo, valor);
  try {
    const atual = lerCache();
    if (!atual) return;
    atual[titulo] = valor;
    sessionStorage.setItem(CHAVE_CACHE, JSON.stringify(atual));
  } catch {
    /* sem sessionStorage o Map acima já resolve a sessão */
  }
}

function doCache(titulo) {
  if (memoria.has(titulo)) return memoria.get(titulo);
  const guardado = lerCache();
  if (guardado && Object.prototype.hasOwnProperty.call(guardado, titulo)) {
    memoria.set(titulo, guardado[titulo]);
    return guardado[titulo];
  }
  return undefined;
}

/* promessas em voo, para duas aberturas seguidas não buscarem duas vezes */
const emVoo = new Map();

/**
 * URL do pôster em w500, ou null quando não dá pra saber.
 * Nunca rejeita: quem chama decide o visual olhando só se veio ou não.
 */
export function posterDoTmdb(titulo, ano) {
  if (!TMDB_API_KEY || !titulo) return Promise.resolve(null);

  const cacheado = doCache(titulo);
  if (cacheado !== undefined) return Promise.resolve(cacheado);
  if (emVoo.has(titulo)) return emVoo.get(titulo);

  const url =
    `${TMDB_BASE}/search/movie?api_key=${encodeURIComponent(TMDB_API_KEY)}` +
    `&query=${encodeURIComponent(titulo)}` +
    (ano ? `&year=${encodeURIComponent(ano)}` : "");

  /* AbortController porque uma requisição pendurada seguraria o cabeçalho
     num estado indefinido; passando o prazo, trata como "não achou". */
  const abortar = new AbortController();
  const prazo = setTimeout(() => abortar.abort(), TEMPO_LIMITE);

  const promessa = fetch(url, { signal: abortar.signal })
    .then((r) => (r.ok ? r.json() : null))
    .then((dados) => {
      const caminho = dados?.results?.[0]?.poster_path;
      return caminho ? `${TMDB_IMG}${caminho}` : null;
    })
    .catch(() => null)
    .then((valor) => {
      clearTimeout(prazo);
      emVoo.delete(titulo);
      gravarCache(titulo, valor);
      return valor;
    });

  emVoo.set(titulo, promessa);
  return promessa;
}
