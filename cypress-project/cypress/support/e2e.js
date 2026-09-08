/**
 * Arquivo de suporte global do Cypress — carregado antes de cada teste.
 */

import './commands'
import 'cypress-mochawesome-reporter/register'

/**
 * O Codex Estelar depende de duas APIs de terceiros reais (SWAPI e o
 * dataset de fotos akabab/starwars-api) sem mocks. Parte dos links de
 * foto já está morta (404) — a aplicação trata isso sozinha (remove a
 * imagem quebrada), mas o erro de rede ainda aparece no console do
 * navegador. Sem isso, esses erros já conhecidos e tratados fariam o
 * Cypress falhar testes que não têm nada a ver com o cenário testado.
 */
Cypress.on('uncaught:exception', () => {
  return false
})
