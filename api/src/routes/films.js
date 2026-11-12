// GET /api/films e /api/films/:id — consumido pela view de Filmes.
const { criarRotaRecurso } = require('./_recurso');

module.exports = criarRotaRecurso('films');
