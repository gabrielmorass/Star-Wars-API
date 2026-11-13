'use strict';

const request = require('supertest');
const nock = require('nock');
const app = require('../src/app');
const swapi = require('../src/services/swapi');

const ORIGEM = 'https://swapi.info';
const humano = {
  name: 'Human',
  classification: 'mammal',
  designation: 'sentient',
  average_height: '180',
  average_lifespan: '120',
  skin_colors: 'caucasian, black, asian, hispanic',
  hair_colors: 'blonde, brown, black, red',
  eye_colors: 'brown, blue, green, hazel, grey, amber',
  language: 'Galactic Basic',
  homeworld: `${ORIGEM}/api/planets/9`,
  people: [`${ORIGEM}/api/people/1`],
  films: [`${ORIGEM}/api/films/1`],
  url: `${ORIGEM}/api/species/1`,
};

describe('Espécies no BFF', () => {
  test('TC-103 lista preserva dados brutos e referências usadas pela interface', async () => {
    const droide = {
      ...humano,
      name: 'Droid',
      classification: 'artificial',
      average_lifespan: 'indefinite',
      homeworld: null,
      people: [],
      films: [],
      url: `${ORIGEM}/api/species/2`,
    };
    nock(ORIGEM).get('/api/species').reply(200, [humano, droide]);
    const resposta = await request(app)
      .get('/api/species')
      .expect('Content-Type', /application\/json/)
      .expect(200);
    expect(resposta.body).toEqual([humano, droide]);
  });

  test('TC-103 lista vazia continua sendo um array sem envelope', async () => {
    nock(ORIGEM).get('/api/species').reply(200, []);
    const resposta = await request(app).get('/api/species').expect(200);
    expect(resposta.body).toEqual([]);
  });

  test('TC-104 detalhe devolve a espécie solicitada sem reescrever suas URLs', async () => {
    nock(ORIGEM).get('/api/species/1').reply(200, humano);
    const resposta = await request(app)
      .get('/api/species/1')
      .expect('Content-Type', /application\/json/)
      .expect(200);
    expect(resposta.body).toEqual(humano);
  });

  test.each(['abc', '0', '-1', '1.5', '01'])('TC-105 ID %s é rejeitado sem consultar a origem', async (id) => {
    const buscar = jest.spyOn(swapi, 'buscar');
    const resposta = await request(app).get(`/api/species/${id}`).expect(400);
    expect(resposta.body).toEqual({ erro: `id inválido: "${id}" (esperado inteiro positivo)` });
    expect(buscar).not.toHaveBeenCalled();
  });

  test('TC-106 espécie inexistente devolve 404 JSON mesmo quando a origem envia HTML', async () => {
    nock(ORIGEM).get('/api/species/999').reply(404, '<html>Not found</html>');
    const resposta = await request(app)
      .get('/api/species/999')
      .expect('Content-Type', /application\/json/)
      .expect(404);
    expect(resposta.body).toEqual({ erro: 'Recurso não encontrado' });
  });

  test.each(['/api/species', '/api/species/1'])('TC-107 falha da SWAPI em %s devolve 502', async (caminho) => {
    nock(ORIGEM).get(caminho).reply(503, 'serviço indisponível');
    const resposta = await request(app)
      .get(caminho)
      .expect('Content-Type', /application\/json/)
      .expect(502);
    expect(resposta.body).toEqual({ erro: 'SWAPI respondeu HTTP 503' });
  });

  test.each(['/api/species', '/api/species/1'])('TC-112 idioma pt-BR acrescenta apresentação em %s', async (caminho) => {
    const lista = caminho === '/api/species';
    nock(ORIGEM).get(caminho).reply(200, lista ? [humano] : humano);
    const resposta = await request(app).get(`${caminho}?idioma=pt-BR`).expect(200);
    const apresentado = lista ? resposta.body[0] : resposta.body;
    const { ptBR, ...originais } = apresentado;
    expect(originais).toEqual(humano);
    if (lista) expect(resposta.body).toHaveLength(1);
    expect(ptBR.classification).toBe('mamífero');
    expect(ptBR.designation).toBe('senciente');
    expect(ptBR.language).toBe('Galactic Basic');
    expect(ptBR.hair_colors).toEqual([
      { valor: 'blonde', nome: 'loiro' }, { valor: 'brown', nome: 'castanho' },
      { valor: 'black', nome: 'preto' }, { valor: 'red', nome: 'vermelho' },
    ]);
  });

  test('TC-112 lista vazia com idioma continua sendo []', async () => {
    nock(ORIGEM).get('/api/species').reply(200, []);
    const resposta = await request(app).get('/api/species?idioma=pt-BR').expect(200);
    expect(resposta.body).toEqual([]);
  });

  test('TC-112 idioma não suportado preserva o pass-through', async () => {
    nock(ORIGEM).get('/api/species/1').reply(200, humano);
    const resposta = await request(app).get('/api/species/1?idioma=en').expect(200);
    expect(resposta.body).toEqual(humano);
  });

  test.each([
    ['/api/species', { results: [humano] }],
    ['/api/species', [null]],
    ['/api/species', [42]],
    ['/api/species', [[]]],
    ['/api/species/1', null],
    ['/api/species/1', 'texto'],
    ['/api/species/1', []],
  ])('TC-113 payload com estrutura inválida em %s vira 502 ao traduzir', async (caminho, dados) => {
    nock(ORIGEM).get(caminho).reply(200, JSON.stringify(dados), { 'Content-Type': 'application/json' });
    const resposta = await request(app).get(`${caminho}?idioma=pt-BR`).expect(502);
    expect(resposta.body).toEqual({ erro: 'SWAPI devolveu espécie em formato inválido' });
  });
});
