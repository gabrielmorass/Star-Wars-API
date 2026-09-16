/**
 * Page Object do Hub.
 * Seletores e ações desta página ficam centralizados aqui — os step
 * definitions e specs nunca acessam seletores CSS diretamente.
 */
class HubPage {
  // Seletores
  get cards() {
    return cy.get('.hub-card')
  }

  // Ações
  acessar() {
    cy.visit('/')
    this.cards.should('have.length', 5)
  }

  clicarCard(dataNav) {
    cy.get(`.hub-card[data-nav="${dataNav}"]`).click()
  }

  // Verificações
  verificarTituloDaPagina(tituloEsperado) {
    cy.title().should('eq', tituloEsperado)
  }
}

export default new HubPage()