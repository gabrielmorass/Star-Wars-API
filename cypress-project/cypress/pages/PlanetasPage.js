/**
 * Page Object da view Sistema Planetário (carrossel).
 */
class PlanetasPage {
  get campoBusca() {
    return cy.get('#planet-search')
  }

  get card() {
    return cy.get('#planet-card')
  }

  get posicao() {
    return cy.get('#planet-position')
  }

  get setaProxima() {
    return cy.get('#next-planet')
  }

  get setaAnterior() {
    return cy.get('#prev-planet')
  }

  // Ações
  acessar() {
    cy.irParaFuncionalidade('planets')
    this.card.find('h3').should('exist')
  }

  buscarPeloNome(termo) {
    this.campoBusca.clear().type(termo)
  }

  avancar() {
    this.setaProxima.click()
  }

  // Verificações
  verificarNomePlaneta(nome) {
    this.card.find('h3').should('contain.text', nome)
  }

  verificarPosicao(posicao) {
    this.posicao.should('contain.text', posicao)
  }
}

export default new PlanetasPage()
