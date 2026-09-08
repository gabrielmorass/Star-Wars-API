/**
 * Step Definitions — Personagens
 * Feature: cypress/bdd/features/personagens/personagens.feature
 */
import { When, Then } from '@badeball/cypress-cucumber-preprocessor'
import PersonagensPage from '../../pages/PersonagensPage'

// =============================================================================
// QUANDO — Ações
// =============================================================================

When('busco por {string}', (termo) => {
  PersonagensPage.buscarPorNome(termo)
})

// =============================================================================
// ENTÃO — Verificações
// =============================================================================

Then('devo ver um único card com o nome {string}', (nome) => {
  PersonagensPage.verificarCardComNome(nome)
})
