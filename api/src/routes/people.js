// GET /api/people e /api/people/:id — consumido pela view de Personagens.
const { criarRotaRecurso } = require('./_recurso');

module.exports = criarRotaRecurso('people');
