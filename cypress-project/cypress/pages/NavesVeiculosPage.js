/**
 * Page Object da view Naves e Veículos.
 */
class NavesVeiculosPage {
  get campoBusca() {
    return cy.get('#vehicles-search')
  }

  get cards() {
    return cy.get('#vehicles-grid .info-card')
  }

  get abaVeiculos() {
    return cy.get('[data-tab="vehicles"]')
  }

  // Ações
  acessar() {
    cy.irParaFuncionalidade('vehicles')
    this.cards.should('have.length.greaterThan', 0)
  }

  buscarPorNome(termo) {
    this.campoBusca.clear().type(termo)
  }

  // Verificações
  verificarUnicoItemComNome(nome) {
    this.cards.should('have.length', 1).and('contain.text', nome)
  }
}

export default new NavesVeiculosPage()
