/**
 * Step Definitions — Espécies
 * Feature: cypress/bdd/features/especies/especies.feature
 */
import { When, Then } from '@badeball/cypress-cucumber-preprocessor'
import EspeciesPage from '../../pages/EspeciesPage'

When('busco por {string} em Espécies', (termo) => {
  EspeciesPage.buscarPorNome(termo)
})

When('seleciono o primeiro resultado', () => {
  EspeciesPage.selecionarPrimeiroResultado()
})

Then('devo ver o planeta natal {string} no detalhe', (planeta) => {
  EspeciesPage.verificarPlanetaNatalNoDetalhe(planeta)
})
