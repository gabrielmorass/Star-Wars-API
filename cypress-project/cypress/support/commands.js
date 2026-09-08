/**
 * Comandos customizados do Cypress, reutilizados entre os step
 * definitions das diferentes funcionalidades.
 */

/**
 * Vai para o Hub e clica no card de navegação da funcionalidade indicada.
 *
 * @param {string} dataNav - valor do atributo data-nav (ex.: "people", "planets")
 *
 * @example
 * cy.irParaFuncionalidade('people')
 */
Cypress.Commands.add('irParaFuncionalidade', (dataNav) => {
  cy.visit('/')
  cy.get(`.hub-card[data-nav="${dataNav}"]`).click()
})
