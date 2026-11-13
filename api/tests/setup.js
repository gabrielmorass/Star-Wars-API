'use strict';

const nock = require('nock');

beforeAll(() => {
  nock.disableNetConnect();
  // Supertest usa uma porta local temporária. Nenhum host externo é liberado.
  nock.enableNetConnect(/^127\.0\.0\.1(?::\d+)?$/);
});

beforeEach(() => {
  const ambiente = {
    ...process.env,
    SWAPI_BASE_URL: 'https://swapi.info/api',
    SWAPI_TIMEOUT_MS: '1000',
    CACHE_TTL_SEGUNDOS: '300',
    NOCK_OFF: 'false',
  };
  delete ambiente.REDIS_URL;
  jest.replaceProperty(process, 'env', ambiente);
});

afterEach(() => {
  const pendentes = nock.pendingMocks();
  nock.abortPendingRequests();
  nock.cleanAll();
  jest.restoreAllMocks();
  jest.useRealTimers();
  expect(pendentes).toEqual([]);
});

afterAll(() => {
  nock.enableNetConnect();
});
