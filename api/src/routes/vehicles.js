// GET /api/vehicles e /api/vehicles/:id — consumido pela view de Naves e Veículos.
const { criarRotaRecurso } = require('./_recurso');
 
module.exports = criarRotaRecurso('vehicles');