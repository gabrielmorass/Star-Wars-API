/**
 * Step Definitions — Naves e Veículos
 * Feature: cypress/bdd/features/naves-e-veiculos/naves-e-veiculos.feature
 */
import { When, Then } from '@badeball/cypress-cucumber-preprocessor'
import NavesVeiculosPage from '../../pages/NavesVeiculosPage'

When('busco por {string} em Naves e Veículos', (termo) => {
  NavesVeiculosPage.buscarPorNome(termo)
})

Then('devo ver um único item de Naves e Veículos com o nome {string}', (nome) => {
  NavesVeiculosPage.verificarUnicoItemComNome(nome)
})
