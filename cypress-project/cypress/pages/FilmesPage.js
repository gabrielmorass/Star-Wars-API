/**
 * Page Object da view Filmes.
 */
class FilmesPage {
  get campoBusca() {
    return cy.get('#films-search')
  }

  get cards() {
    return cy.get('#films-grid .info-card')
  }

  // Ações
  acessar() {
    cy.irParaFuncionalidade('films')
    this.cards.should('have.length.greaterThan', 0)
  }

  buscarPeloTitulo(termo) {
    this.campoBusca.clear().type(termo)
  }

  // Verificações
  verificarUnicoFilmeComTitulo(titulo) {
    this.cards.should('have.length', 1).and('contain.text', titulo)
  }
}

export default new FilmesPage()
