// Fábrica de rotas de pass-through — Codex Estelar · Bloco B (Eduardo)
//
// Toda rota de recurso da SWAPI tem o mesmo formato:
//   GET /            → lista completa (array cru, como a swapi.info entrega)
//   GET /:id         → um item
//
// Para adicionar species, vehicles, starships ou planets, basta um arquivo
// de uma linha (veja people.js) e um app.use() no app.js.
//
// PASS-THROUGH FIEL: a resposta é o JSON da SWAPI sem alteração, inclusive
// os campos "url" apontando para https://swapi.info/api/... As views do
// front indexam tudo por essa url e cruzam com outros recursos; reescrever
// as urls quebraria esses cruzamentos.

const { Router } = require('express');
const swapi = require('../services/swapi');

// Só inteiros positivos, sem zero à esquerda: "1", "42". Rejeita "abc",
// "0", "-1", "1.5" e "01" antes de gastar uma chamada à SWAPI.
const ID_VALIDO = /^[1-9]\d*$/;

function criarRotaRecurso(recurso) {
  const router = Router();

  // Express 5 encaminha ao tratador de erros qualquer rejeição de handler
  // async; por isso não há try/catch aqui.
  router.get('/', async (req, res) => {
    res.json(await swapi.buscar(recurso));
  });

  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    if (!ID_VALIDO.test(id)) {
      return res.status(400).json({ erro: `id inválido: "${id}" (esperado inteiro positivo)` });
    }
    res.json(await swapi.buscar(`${recurso}/${id}`));
  });

  return router;
}

module.exports = { criarRotaRecurso };
