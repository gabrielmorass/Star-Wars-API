/**
 * Teste de carga (bônus) — Codex Estelar / SWAPI
 * Ferramenta: k6
 *
 * Carga deliberadamente modesta (poucos VUs, execuções curtas), por se
 * tratar de API pública de terceiros (ver Riscos e Limitações do Plano
 * de Testes).
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js'

const BASE_URL = 'https://swapi.info/api'

export const options = {
  scenarios: {
    // TC-P01 — carga leve e constante na listagem de personagens
    listagem_pessoas: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'listagemPessoas',
    },
    // TC-P02 — pico curto de acessos na listagem de filmes
    pico_filmes: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '15s', target: 10 },
        { duration: '5s', target: 0 },
      ],
      exec: 'picoFilmes',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% das respostas abaixo de 2s
    http_req_failed: ['rate<0.05'],    // menos de 5% de falhas
  },
}

export function listagemPessoas() {
  const res = http.get(`${BASE_URL}/people`)
  check(res, {
    'TC-P01: status 200': (r) => r.status === 200,
    'TC-P01: lista não vazia': (r) => JSON.parse(r.body).length > 0,
  })
  sleep(1)
}

export function picoFilmes() {
  const res = http.get(`${BASE_URL}/films`)
  check(res, {
    'TC-P02: status 200': (r) => r.status === 200,
    'TC-P02: 6 filmes': (r) => JSON.parse(r.body).length === 6,
  })
  sleep(1)
}

export function handleSummary(data) {
  return { 'relatorio/index.html': htmlReport(data) }
}