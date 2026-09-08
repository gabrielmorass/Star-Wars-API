/**
 * Step Definitions — Sistema Planetário
 * Feature: cypress/bdd/features/planetas/planetas.feature
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
