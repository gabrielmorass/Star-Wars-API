/**
 * Page Object da view Personagens.
 * Seletores e ações desta página ficam centralizados aqui — os step
 * definitions e specs nunca acessam seletores CSS diretamente.
 */
class PersonagensPage {
  // Seletores
  get campoBusca() {
    return cy.get('#people-search')
  }

  get cards() {
    return cy.get('.person-card')
  }

  // Ações
  acessar() {
    cy.irParaFuncionalidade('people')
    // Garante que a grade terminou de carregar (fotos resolvidas) antes de interagir
    this.cards.should('have.length.greaterThan', 0)
  }

  buscarPorNome(termo) {
    this.campoBusca.clear().type(termo)
  }

  abrirPrimeiroResultado() {
    this.cards.first().click()
  }

  // Verificações
  verificarQuantidadeDeCards(quantidadeEsperada) {
    this.cards.should('have.length', quantidadeEsperada)
  }

  verificarCardComNome(nome) {
    this.cards.should('have.length', 1).and('contain.text', nome)
  }
}

export default new PersonagensPage()
