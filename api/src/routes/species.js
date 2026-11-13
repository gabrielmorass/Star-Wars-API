// GET /api/species e /api/species/:id — Daniele (Bloco C).
const { criarRotaRecurso } = require('./_recurso');
const { ErroSwapi } = require('../services/swapi');
const { traduzirEspecie } = require('../domain/traduzir');

function apresentarEspecies(dados, req) {
  if (req.query.idioma !== 'pt-BR') return dados;

  const lista = req.params.id === undefined;
  const itens = lista ? dados : [dados];
  if (!Array.isArray(itens) || itens.some((item) =>
    !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new ErroSwapi(502, 'SWAPI devolveu espécie em formato inválido');
  }

  return lista ? itens.map(traduzirEspecie) : traduzirEspecie(dados);
}

module.exports = criarRotaRecurso('species', apresentarEspecies);
