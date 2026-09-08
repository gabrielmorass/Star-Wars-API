/**
 * Page Object da view Espécies.
 */
class EspeciesPage {
  get campoBusca() {
    return cy.get('#species-search')
  }

  get cards() {
    return cy.get('#species-grid .info-card')
  }

  get detalhe() {
    return cy.get('#species-detail')
  }

  // Ações
  acessar() {
    cy.irParaFuncionalidade('species')
    this.cards.should('have.length.greaterThan', 0)
  }

  buscarPorNome(termo) {
    this.campoBusca.clear().type(termo)
  }

  selecionarPrimeiroResultado() {
    this.cards.first().click()
  }

  // Verificações
  verificarPlanetaNatalNoDetalhe(planeta) {
    this.detalhe.should('contain.text', planeta)
  }
}

export default new EspeciesPage()
