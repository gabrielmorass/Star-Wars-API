
/**
 * Step Definitions — Hub
 * Feature: cypress/bdd/features/hub/navegacao.feature
 */
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'
import HubPage from '../../pages/HubPage'

// =============================================================================
// DADO — Contexto
// =============================================================================

Given('que acesso o Hub', () => {
  HubPage.acessar()
})

// =============================================================================
// QUANDO — Ações
// =============================================================================

When('clico no card {string}', (dataNav) => {
  HubPage.clicarCard(dataNav)
})

// =============================================================================
// ENTÃO — Verificações
// =============================================================================

Then('devo ser levado para a página com o título {string}', (tituloEsperado) => {
  HubPage.verificarTituloDaPagina(tituloEsperado)
})