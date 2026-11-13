'use strict';

jest.mock('redis', () => ({ createClient: jest.fn() }));

const { createClient } = require('redis');
const { criarCache, comCache, ativarCache, comTimeout } = require('../src/services/cache');

let log;
beforeEach(() => {
  log = { log: jest.fn(), warn: jest.fn() };
});

describe('TC-099 leitura e escrita do cache', () => {
  test('sem cliente funciona como cache desligado', async () => {
    const cache = criarCache();
    await expect(cache.obter('people')).resolves.toBeNull();
    await expect(cache.guardar('people', [])).resolves.toBe(false);
  });

  test('hit desserializa o JSON e usa o prefixo configurado', async () => {
    const cliente = { get: jest.fn().mockResolvedValue('{"name":"Luke"}') };
    const cache = criarCache({ cliente, prefixo: 'teste:', log });
    await expect(cache.obter('people/1')).resolves.toEqual({ name: 'Luke' });
    expect(cliente.get).toHaveBeenCalledWith('teste:people/1');
  });

  test.each([null, undefined])('chave ausente (%s) é miss', async (valor) => {
    const cache = criarCache({ cliente: { get: jest.fn().mockResolvedValue(valor) }, log });
    await expect(cache.obter('people')).resolves.toBeNull();
  });

  test('JSON inválido não derruba o cache', async () => {
    const cache = criarCache({ cliente: { get: jest.fn().mockResolvedValue('{inválido') }, log });
    await expect(cache.obter('people')).resolves.toBeNull();
    expect(log.warn).toHaveBeenCalledTimes(1);
  });

  test.each(['rejeição', 'exceção síncrona'])('falha de leitura (%s) vira miss', async (tipo) => {
    const get = jest.fn(() => {
      if (tipo === 'exceção síncrona') throw new Error('Redis fora');
      return Promise.reject(new Error('Redis fora'));
    });
    await expect(criarCache({ cliente: { get }, log }).obter('people')).resolves.toBeNull();
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('Redis fora'));
  });

  test('setEx recebe JSON e TTL do ambiente', async () => {
    process.env.CACHE_TTL_SEGUNDOS = '60';
    const cliente = { setEx: jest.fn().mockResolvedValue('OK') };
    await expect(criarCache({ cliente, log }).guardar('people', [])).resolves.toBe(true);
    expect(cliente.setEx).toHaveBeenCalledWith('codex:people', 60, '[]');
  });

  test('usa TTL padrão quando o ambiente não define um número', async () => {
    delete process.env.CACHE_TTL_SEGUNDOS;
    const cliente = { setEx: jest.fn().mockResolvedValue('OK') };
    await criarCache({ cliente, log }).guardar('people', []);
    expect(cliente.setEx).toHaveBeenCalledWith('codex:people', 300, '[]');
  });

  test('setex também é suportado e TTL por chamada prevalece', async () => {
    const cliente = { setex: jest.fn().mockResolvedValue('OK') };
    await criarCache({ cliente, ttlPadrao: 60, log }).guardar('people', [], 15);
    expect(cliente.setex).toHaveBeenCalledWith('codex:people', 15, '[]');
  });

  test('undefined não é enviado ao Redis', async () => {
    const cliente = { setEx: jest.fn() };
    await expect(criarCache({ cliente, log }).guardar('people', undefined)).resolves.toBe(false);
    expect(cliente.setEx).not.toHaveBeenCalled();
  });

  test('falha de escrita não derruba a API', async () => {
    const cliente = { setEx: jest.fn().mockRejectedValue(new Error('Redis fora')) };
    await expect(criarCache({ cliente, log }).guardar('people', [])).resolves.toBe(false);
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('escrita falhou'));
  });
});

describe('TC-100 cache-aside e TTL', () => {
  test('hit evita consultar a origem', async () => {
    const buscar = jest.fn();
    const cache = criarCache({ cliente: { get: jest.fn().mockResolvedValue('[]') }, log });
    await expect(cache.lembrar('people', buscar)).resolves.toEqual([]);
    expect(buscar).not.toHaveBeenCalled();
  });

  test('miss busca a origem, grava e devolve o resultado', async () => {
    const cliente = { get: jest.fn().mockResolvedValue(null), setEx: jest.fn().mockResolvedValue('OK') };
    const buscar = jest.fn().mockResolvedValue([{ name: 'Luke' }]);
    const resultado = await criarCache({ cliente, log }).lembrar('people', buscar, 20);
    expect(resultado).toEqual([{ name: 'Luke' }]);
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(cliente.setEx).toHaveBeenCalledWith('codex:people', 20, JSON.stringify(resultado));
  });

  test('erro da origem é propagado e não entra no cache', async () => {
    const cliente = { get: jest.fn().mockResolvedValue(null), setEx: jest.fn() };
    const erro = Object.assign(new Error('Recurso não encontrado'), { status: 404 });
    const buscar = jest.fn().mockRejectedValue(erro);
    await expect(criarCache({ cliente, log }).lembrar('people/999', buscar)).rejects.toBe(erro);
    expect(cliente.setEx).not.toHaveBeenCalled();
  });

  test('Redis fora mantém a resposta da origem', async () => {
    const cliente = {
      get: jest.fn().mockRejectedValue(new Error('Redis fora')),
      setEx: jest.fn().mockRejectedValue(new Error('Redis fora')),
    };
    const buscar = jest.fn().mockResolvedValue([{ name: 'Luke' }]);
    await expect(criarCache({ cliente, log }).lembrar('people', buscar)).resolves.toEqual([{ name: 'Luke' }]);
  });

  test('após expirar no Redis a origem é consultada novamente', async () => {
    jest.useFakeTimers();
    const dados = new Map();
    // Dublê do contrato get/setEx: a expiração é responsabilidade do Redis.
    const cliente = {
      get: jest.fn(async (chave) => {
        const item = dados.get(chave);
        return item && item.expira > Date.now() ? item.valor : null;
      }),
      setEx: jest.fn(async (chave, segundos, valor) => {
        dados.set(chave, { valor, expira: Date.now() + segundos * 1000 });
      }),
    };
    const buscar = jest.fn().mockResolvedValueOnce(['primeiro']).mockResolvedValueOnce(['atualizado']);
    const cache = criarCache({ cliente, ttlPadrao: 2, log });
    await expect(cache.lembrar('people', buscar)).resolves.toEqual(['primeiro']);
    await expect(cache.lembrar('people', buscar)).resolves.toEqual(['primeiro']);
    await jest.advanceTimersByTimeAsync(2001);
    await expect(cache.lembrar('people', buscar)).resolves.toEqual(['atualizado']);
    expect(buscar).toHaveBeenCalledTimes(2);
  });

  test('wrapper normaliza a chave e preserva o caminho enviado à origem', async () => {
    const cache = criarCache({ log });
    const lembrar = jest.spyOn(cache, 'lembrar');
    const buscar = jest.fn().mockResolvedValue([]);
    await expect(comCache(cache, buscar, { ttl: 10 })('/people')).resolves.toEqual([]);
    expect(lembrar).toHaveBeenCalledWith('people', expect.any(Function), 10);
    expect(buscar).toHaveBeenCalledWith('/people');
    await expect(comCache(cache, buscar)('films')).resolves.toEqual([]);
  });
});

describe('TC-101 proteção contra Redis lento', () => {
  test('promessa concluída libera o timer', async () => {
    jest.useFakeTimers();
    await expect(comTimeout(Promise.resolve('OK'), 20)).resolves.toBe('OK');
    expect(jest.getTimerCount()).toBe(0);
  });

  test.each(['leitura', 'escrita'])('%s pendurada termina no prazo configurado', async (operacao) => {
    jest.useFakeTimers();
    const pendente = jest.fn(() => new Promise(() => {}));
    const cache = criarCache({ cliente: { get: pendente, setEx: pendente }, timeoutMs: 20, log });
    const promessa = operacao === 'leitura' ? cache.obter('people') : cache.guardar('people', []);
    const verificacao = expect(promessa).resolves.toBe(operacao === 'leitura' ? null : false);
    await jest.advanceTimersByTimeAsync(20);
    await verificacao;
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('redis sem resposta em 20ms'));
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('TC-102 ativação e reconexão do cache', () => {
  function clienteFalso(conectar = Promise.resolve()) {
    const eventos = {};
    const cliente = {
      on: jest.fn((nome, callback) => { eventos[nome] = callback; }),
      connect: jest.fn().mockReturnValue(conectar),
      get: jest.fn().mockResolvedValue(null),
      setEx: jest.fn().mockResolvedValue('OK'),
    };
    return { cliente, eventos };
  }

  test('sem REDIS_URL preserva a função original', () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const swapi = { buscar: jest.fn() };
    const original = swapi.buscar;
    expect(ativarCache(swapi)).toBeNull();
    expect(swapi.buscar).toBe(original);
    expect(createClient).not.toHaveBeenCalled();
  });

  test('cliente injetado recebe URL, conecta e envolve a origem', async () => {
    const { cliente } = clienteFalso();
    const criarCliente = jest.fn().mockReturnValue(cliente);
    const original = jest.fn().mockResolvedValue([]);
    const swapi = { buscar: original };
    const ligado = ativarCache(swapi, { url: 'redis://teste:6379', criarCliente, log });
    expect(criarCliente).toHaveBeenCalledWith({ url: 'redis://teste:6379', disableOfflineQueue: true });
    expect(cliente.connect).toHaveBeenCalledTimes(1);
    expect(ligado.cliente).toBe(cliente);
    await expect(swapi.buscar('people')).resolves.toEqual([]);
    expect(original).toHaveBeenCalledWith('people');
  });

  test('fábrica padrão usa REDIS_URL e avisa uma vez por queda', () => {
    const { cliente, eventos } = clienteFalso();
    createClient.mockReturnValue(cliente);
    process.env.REDIS_URL = 'redis://teste:6379';
    ativarCache({ buscar: jest.fn() }, { log });
    expect(createClient).toHaveBeenCalledWith({ url: 'redis://teste:6379', disableOfflineQueue: true });
    eventos.error(new Error('queda'));
    eventos.error(new Error('mesma queda'));
    expect(log.warn).toHaveBeenCalledTimes(1);
    eventos.ready();
    eventos.error(new Error('nova queda'));
    expect(log.warn).toHaveBeenCalledTimes(2);
    expect(log.log).toHaveBeenCalledWith('[cache] conectado ao Redis');
  });

  test('conexão recusada é tratada e registrada', async () => {
    const { cliente } = clienteFalso(Promise.reject(new Error('conexão recusada')));
    ativarCache({ buscar: jest.fn() }, { url: 'redis://teste:6379', criarCliente: () => cliente, log });
    await Promise.resolve();
    expect(log.warn).toHaveBeenCalledWith('[cache] falha ao conectar no Redis: conexão recusada');
  });
});
