/**
 * Step Definitions — Sistema Planetário
 * Features: cypress/bdd/features/planetas/busca.feature
 *           cypress/bdd/features/planetas/navegacao-por-setas.feature
 */
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'
import PlanetasPage from '../../pages/PlanetasPage'

Given('que o planeta em exibição é {string}', (nome) => {
  PlanetasPage.verificarNomePlaneta(nome)
})

When('busco pelo planeta {string}', (termo) => {
  PlanetasPage.buscarPeloNome(termo)
})

Then('devo ver o planeta {string} em exibição', (nome) => {
  PlanetasPage.verificarNomePlaneta(nome)
})

When('avanço para o próximo planeta', () => {
  PlanetasPage.avancar()
})

When('retrocedo para o planeta anterior', () => {
  PlanetasPage.retroceder()
})

Then('devo ver a posição {string} do carrossel', (numero) => {
  PlanetasPage.verificarPosicaoAtual(numero)
})

Then('devo estar no último planeta do carrossel', () => {
  PlanetasPage.verificarUltimoPlaneta()
})