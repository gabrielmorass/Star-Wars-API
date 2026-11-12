'use strict';
 
// Camada de cache sobre o Redis — Codex Estelar · S07 NP2
// Dono: Samile (Bloco D)
//
// Plugada no BFF sem tocar nas rotas: as rotas chamam swapi.buscar(caminho), e
// ativarCache() troca essa função por uma versão que consulta o Redis antes.
// Só o server.js liga o cache; o app.js continua sem Redis, então os testes do
// Bloco C (supertest) seguem rodando sem nenhuma dependência externa.
//
// Degradação graciosa: se o Redis cair, ficar lento ou devolver lixo, a api
// NÃO falha. Toda operação no Redis é protegida por try/catch e por um tempo
// limite; em caso de problema o cache vira "miss" e a rota busca na SWAPI,
// só um pouco mais devagar. Erros da SWAPI (ErroSwapi 404/502) continuam
// subindo normalmente e nunca são guardados no cache.
//
// O cliente é injetado em criarCache(), então os testes usam um mock (hit,
// miss, erro, TTL). Sem cliente, o cache fica desligado.
 
const TTL_PADRAO_SEGUNDOS = 300;
const TIMEOUT_PADRAO_MS = 200;
 
// Rejeita se a promessa não resolver no prazo. Rede de segurança: com o Redis
// fora do ar a requisição não pode ficar pendurada.
function comTimeout(promessa, ms) {
  let timer;
  const limite = new Promise((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new Error(`redis sem resposta em ${ms}ms`)), ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}
 
function criarCache({
  cliente = null,
  ttlPadrao = Number(process.env.CACHE_TTL_SEGUNDOS) || TTL_PADRAO_SEGUNDOS,
  timeoutMs = TIMEOUT_PADRAO_MS,
  prefixo = 'codex:',
  log = console,
} = {}) {
  // Lê uma chave. Devolve o valor guardado ou null (miss, erro ou cache desligado).
  async function obter(chave) {
    if (!cliente) return null;
    try {
      const bruto = await comTimeout(Promise.resolve(cliente.get(prefixo + chave)), timeoutMs);
      if (bruto === null || bruto === undefined) return null;
      return JSON.parse(bruto);
    } catch (erro) {
      log.warn(`[cache] leitura falhou (${chave}): ${erro.message}`);
      return null;
    }
  }
 
  // Grava uma chave com TTL em segundos. Devolve true se gravou, false se não.
  async function guardar(chave, valor, ttl) {
    if (!cliente || valor === undefined) return false;
    const segundos = ttl ?? ttlPadrao;
    try {
      // node-redis expõe setEx; ioredis expõe setex.
      const gravar = cliente.setEx ?? cliente.setex;
      await comTimeout(
        Promise.resolve(gravar.call(cliente, prefixo + chave, segundos, JSON.stringify(valor))),
        timeoutMs,
      );
      return true;
    } catch (erro) {
      log.warn(`[cache] escrita falhou (${chave}): ${erro.message}`);
      return false;
    }
  }
 
  // Cache-aside: devolve do cache se houver, senão chama `buscar`, guarda o
  // resultado e devolve. Erro de `buscar` não é engolido nem guardado.
  async function lembrar(chave, buscar, ttl) {
    const emCache = await obter(chave);
    if (emCache !== null) return emCache;
    const valor = await buscar();
    await guardar(chave, valor, ttl);
    return valor;
  }
 
  return { obter, guardar, lembrar };
}
 
// Envolve uma função buscar(caminho) com o cache. A chave é o próprio caminho
// ("people", "vehicles/4"), sem barra inicial.
function comCache(cache, buscar, { ttl } = {}) {
  return (caminho) => cache.lembrar(String(caminho).replace(/^\/+/, ''), () => buscar(caminho), ttl);
}
 
// Liga o cache ao BFF. Chamada uma vez, no server.js, antes do listen().
// Sem REDIS_URL o cache fica desligado e o BFF funciona como antes.
// Devolve { cache, cliente } (o cliente serve ao /api/health do Gabriel) ou
// null se o cache não foi ligado.
function ativarCache(
  swapi,
  { url = process.env.REDIS_URL, log = console, criarCliente } = {},
) {
  if (!url) {
    log.log('[cache] REDIS_URL ausente: cache desligado');
    return null;
  }
 
  const fabrica = criarCliente ?? require('redis').createClient;
  // disableOfflineQueue: com o Redis fora, o comando falha na hora em vez de
  // ficar enfileirado esperando a reconexão.
  const cliente = fabrica({ url, disableOfflineQueue: true });
 
  // Sem um handler de 'error' o Node derruba o processo inteiro quando o Redis
  // cai. Avisa uma vez por queda, para não inundar o log nas tentativas.
  let avisou = false;
  cliente.on('error', (erro) => {
    if (!avisou) {
      log.warn(`[cache] Redis indisponível: ${erro.message}`);
      avisou = true;
    }
  });
  cliente.on('ready', () => {
    avisou = false;
    log.log('[cache] conectado ao Redis');
  });
  Promise.resolve(cliente.connect()).catch((erro) => {
    log.warn(`[cache] falha ao conectar no Redis: ${erro.message}`);
  });
 
  const cache = criarCache({ cliente, log });
  swapi.buscar = comCache(cache, swapi.buscar);
  log.log('[cache] cache Redis ligado');
  return { cache, cliente };
}
 
module.exports = {
  criarCache,
  comCache,
  ativarCache,
  comTimeout,
  TTL_PADRAO_SEGUNDOS,
  TIMEOUT_PADRAO_MS,
};
 