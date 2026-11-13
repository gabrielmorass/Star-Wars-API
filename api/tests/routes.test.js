'use strict';

const request = require('supertest');
const nock = require('nock');
const app = require('../src/app');
const swapi = require('../src/services/swapi');
const { version } = require('../package.json');

const ORIGEM = 'https://swapi.info';

describe('TC-091 saúde e tratamento de rotas', () => {
  test('health responde sem consultar SWAPI ou Redis e não anuncia Express', async () => {
    const resposta = await request(app).get('/api/health').expect(200);
    expect(resposta.body).toEqual({ status: 'ok', versao: version });
    expect(resposta.headers['content-type']).toMatch(/application\/json/);
    expect(resposta.headers['x-powered-by']).toBeUndefined();
  });

  test('rota inexistente devolve erro JSON', async () => {
    const resposta = await request(app).get('/api/inexistente').expect(404);
    expect(resposta.body).toEqual({ erro: 'rota não encontrada: GET /api/inexistente' });
  });

  test('erro inesperado não expõe informações internas', async () => {
    const erro = new Error('detalhe interno sensível');
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(swapi, 'buscar').mockRejectedValue(erro);
    const resposta = await request(app).get('/api/people').expect(500);
    expect(resposta.body).toEqual({ erro: 'erro interno' });
    expect(log).toHaveBeenCalledWith(erro);
  });
});

describe.each(['people', 'films', 'vehicles', 'starships'])('/api/%s', (recurso) => {
  const item = {
    name: 'Nome original',
    url: `${ORIGEM}/api/${recurso}/1`,
    homeworld: `${ORIGEM}/api/planets/1`,
    films: [`${ORIGEM}/api/films/1`],
  };

  test('TC-092 lista preserva array e referências originais da SWAPI', async () => {
    nock(ORIGEM).get(`/api/${recurso}`).reply(200, [item]);
    const resposta = await request(app).get(`/api/${recurso}`).expect(200);
    expect(resposta.body).toEqual([item]);
  });

  test('TC-093 detalhe preserva o objeto original', async () => {
    nock(ORIGEM).get(`/api/${recurso}/1`).reply(200, item);
    const resposta = await request(app).get(`/api/${recurso}/1`).expect(200);
    expect(resposta.body).toEqual(item);
  });

  test.each(['abc', '0', '-1', '1.5', '01'])('TC-094 rejeita ID %s antes de consultar a SWAPI', async (id) => {
    const buscar = jest.spyOn(swapi, 'buscar');
    const resposta = await request(app).get(`/api/${recurso}/${id}`).expect(400);
    expect(resposta.body).toEqual({ erro: `id inválido: "${id}" (esperado inteiro positivo)` });
    expect(buscar).not.toHaveBeenCalled();
  });

  test('TC-095 404 HTML da SWAPI vira 404 JSON no BFF', async () => {
    nock(ORIGEM).get(`/api/${recurso}/999`).reply(404, '<html>Not found</html>');
    const resposta = await request(app).get(`/api/${recurso}/999`).expect(404);
    expect(resposta.body).toEqual({ erro: 'Recurso não encontrado' });
  });

  test('TC-096 falha da SWAPI vira 502 JSON no BFF', async () => {
    nock(ORIGEM).get(`/api/${recurso}`).reply(500, 'falha externa');
    const resposta = await request(app).get(`/api/${recurso}`).expect(502);
    expect(resposta.body).toEqual({ erro: 'SWAPI respondeu HTTP 500' });
  });
});

describe('TC-097 falhas externas no fluxo HTTP completo', () => {
  test('resposta que não é JSON vira 502', async () => {
    nock(ORIGEM).get('/api/people').reply(200, '<html>indisponível</html>');
    const resposta = await request(app).get('/api/people').expect(502);
    expect(resposta.body).toEqual({ erro: 'SWAPI devolveu uma resposta que não é JSON' });
  });

  test('timeout externo vira 502', async () => {
    process.env.SWAPI_TIMEOUT_MS = '20';
    nock(ORIGEM).get('/api/people').delay(100).reply(200, []);
    const resposta = await request(app).get('/api/people').expect(502);
    expect(resposta.body).toEqual({ erro: 'SWAPI não respondeu a tempo' });
  });

  test('falha de rede vira 502', async () => {
    nock(ORIGEM).get('/api/people').replyWithError('conexão encerrada');
    const resposta = await request(app).get('/api/people').expect(502);
    expect(resposta.body).toEqual({ erro: 'SWAPI está indisponível' });
  });
});
