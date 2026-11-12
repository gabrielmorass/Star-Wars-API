// GET /api/health — Codex Estelar
//
// Versão MÍNIMA, criada pelo Eduardo (Bloco B) só para que o HEALTHCHECK do
// api/Dockerfile e o do docker-compose.yml tenham onde bater desde já.
//
// O Gabriel amplia esta rota com o estado do Redis (ex.: responder 503
// quando o cache não estiver acessível). Ao ampliar, manter:
//   - status 200 + { status: "ok" } quando saudável (o smoke test e o
//     healthcheck só olham o código HTTP);
//   - resposta rápida e SEM chamar a SWAPI: um healthcheck que depende de
//     API externa derruba o container quando a SWAPI cai.

const { Router } = require('express');
const { version } = require('../../package.json');

const router = Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', versao: version });
});

module.exports = router;
