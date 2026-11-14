// GET /api/planets e /api/planets/:id — consumido pelo modal de Personagens
// (planeta natal) e pela aba Planetas do modal de Filmes.
const { criarRotaRecurso } = require('./_recurso');

module.exports = criarRotaRecurso('planets');
