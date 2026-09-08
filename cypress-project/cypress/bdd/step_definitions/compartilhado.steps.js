/**
 * Step Definitions Compartilhados
 *
 * Passos "Dado que acesso a página de X" reutilizados no Contexto de
 * cada feature — um por funcionalidade do Codex Estelar. Também abriga
 * "devo ver a mensagem X", que checa a classe .state-msg usada de forma
 * idêntica em todas as grades (Personagens, Filmes, Naves e Veículos,
 * Espécies) para os estados de "nenhum resultado".
 */
import { Given, Then } from '@badeball/cypress-cucumber-preprocessor'
import PersonagensPage from '../../pages/PersonagensPage'
import PlanetasPage from '../../pages/PlanetasPage'
import FilmesPage from '../../pages/FilmesPage'
import NavesVeiculosPage from '../../pages/NavesVeiculosPage'
import EspeciesPage from '../../pages/EspeciesPage'

// =============================================================================
// DADO — Navegação para páginas
// =============================================================================

Given('que acesso a página de Personagens', () => {
  PersonagensPage.acessar()
})

Given('que acesso a página de Planetas', () => {
  PlanetasPage.acessar()
})

Given('que acesso a página de Filmes', () => {
  FilmesPage.acessar()
})

Given('que acesso a página de Naves e Veículos', () => {
  NavesVeiculosPage.acessar()
})

Given('que acesso a página de Espécies', () => {
  EspeciesPage.acessar()
})

// =============================================================================
// ENTÃO — Verificações compartilhadas
// =============================================================================

Then('devo ver a mensagem {string}', (mensagem) => {
  cy.get('.state-msg').should('contain.text', mensagem)
})
