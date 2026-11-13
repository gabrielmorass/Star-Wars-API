'use strict';

const nock = require('nock');
const { buscar, ErroSwapi } = require('../src/services/swapi');

describe('TC-098 configuração do cliente SWAPI', () => {
  test('usa a origem padrão e aceita barras iniciais no caminho', async () => {
    delete process.env.SWAPI_BASE_URL;
    delete process.env.SWAPI_TIMEOUT_MS;
    nock('https://swapi.info').get('/api/people/1').reply(200, { name: 'Luke Skywalker' });
    await expect(buscar('/people/1')).resolves.toEqual({ name: 'Luke Skywalker' });
  });

  test('respeita a origem configurada e remove barras finais', async () => {
    process.env.SWAPI_BASE_URL = 'https://swapi-teste.example/api///';
    nock('https://swapi-teste.example').get('/api/films').reply(200, []);
    await expect(buscar('films')).resolves.toEqual([]);
  });

  test('expõe erro de domínio com status e mensagem', () => {
    const erro = new ErroSwapi(404, 'Recurso não encontrado');
    expect(erro).toBeInstanceOf(Error);
    expect(erro).toMatchObject({ name: 'ErroSwapi', status: 404, message: 'Recurso não encontrado' });
  });
});
