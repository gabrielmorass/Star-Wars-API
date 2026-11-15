// GET /api/health — Codex Estelar
//
// Criada pelo Eduardo (Bloco B) como versão mínima, para o HEALTHCHECK do
// api/Dockerfile e do docker-compose.yml terem onde bater. Ampliada pelo
// Gabriel (Bloco A) com o estado do cache.
//
// CONTRATO, de propósito: enquanto a api responde, esta rota devolve 200.
// O estado do Redis vai no CORPO, nunca no código HTTP.
//
// Por que não 503 com o Redis fora: o cache tem degradação graciosa
// (services/cache.js) — sem Redis as rotas continuam respondendo pela
// SWAPI. Se o health devolvesse 503 nessa situação, o HEALTHCHECK marcaria
// a api como unhealthy, o `depends_on: service_healthy` do web não
// liberaria, e uma queda do cache derrubaria o site INTEIRO — o oposto do
// que a degradação graciosa existe para evitar. Quem precisa de rigor
// sobre o Redis é o smoke test, que confere o PONG separadamente.
//
// Continua sem chamar a SWAPI: healthcheck que depende de API de terceiro
// derruba o container quando o terceiro cai.

const { Router } = require('express');
const { version } = require('../../package.json');

const router = Router();

// Estado do cache, consultado a cada resposta.
//
// O app.js não conhece Redis — é o que permite o supertest da Daniele
// rodar sem subir cache. Então quem liga o cache (o server.js, no
// bootstrap) registra aqui a função que sabe responder pelo cliente.
// Sem registro, o padrão é 'desligado'.
let sondaDeCache = () => 'desligado';

// Anexada ao router em vez de exportada à parte: o app.js importa este
// módulo como middleware (`app.use('/api/health', health)`) e essa
// assinatura não muda.
router.definirSondaDeCache = (sonda) => {
  sondaDeCache = typeof sonda === 'function' ? sonda : () => 'desligado';
};

router.get('/', (req, res) => {
  res.json({ status: 'ok', versao: version, cache: sondaDeCache() });
});

module.exports = router;
