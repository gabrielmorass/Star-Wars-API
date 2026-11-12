/ GET /api/starships e /api/starships/:id — consumido pela view de Naves e Veículos.
const { criarRotaRecurso } = require('./_recurso');
 
module.exports = criarRotaRecurso('starships');