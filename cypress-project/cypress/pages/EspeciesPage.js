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

  verificarQuantidade(quantidade) {
    this.cards.should('have.length', quantidade)
  }

  filtrarMamiferos() {
    cy.get('.sp-classes [data-classe="mamifero"]').click()
  }

  verificarSomenteHuman() {
    this.cards.should('have.length', 1).and('contain.text', 'Human')
    cy.get('#species-grid').should('not.contain.text', 'Droid')
  }

  verificarTextosDoServidor() {
    cy.get('#species-grid .meta').should('contain.text', 'classificação do servidor')
      .and('contain.text', 'idioma do servidor')
    this.detalhe.find('.sp-head-pills').should('contain.text', 'classificação do servidor')
      .and('contain.text', 'designação do servidor')
      .and('contain.text', 'idioma do servidor')
  }

  verificarAmostrasDoServidor() {
    const nomes = ['pele do servidor', 'cabelo do servidor', 'olhos do servidor']
    const cores = ['rgb(123, 74, 45)', 'rgb(31, 31, 31)', 'rgb(59, 130, 246)']
    this.detalhe.find('.sp-cor-linha').each(($linha, indice) => {
      cy.wrap($linha).should('contain.text', nomes[indice])
      cy.wrap($linha).find('.sp-cor i').should('have.css', 'background-color', cores[indice])
    })
  }

  verificarTraducaoLocal() {
    this.detalhe.find('.sp-head-pills').should('contain.text', 'mamífero')
      .and('contain.text', 'senciente').and('contain.text', 'Galactic Basic')
    this.detalhe.find('.sp-cor-linha').eq(0).should('contain.text', 'castanho')
  }

  verificarMarcacaoComoTexto() {
    cy.get('#species-grid .meta').should('contain.text', '<b>classe do servidor</b>')
    this.detalhe.find('.sp-head-pills').should('contain.text', '<b>classe do servidor</b>')
    this.detalhe.find('.sp-head-pills b').should('not.exist')
    this.detalhe.find('.sp-cor-linha').eq(0).should('contain.text', '<em>pele do servidor</em>')
    this.detalhe.find('.sp-cor-linha em').should('not.exist')
  }

  verificarCoresAusentes() {
    this.detalhe.find('.sp-cor--sem').should('have.length', 3)
    this.detalhe.find('.sp-cor-linha').should('contain.text', 'não se aplica')
      .and('contain.text', 'nenhum').and('contain.text', 'desconhecido')
    this.detalhe.find('.sp-cor-linha i').should('not.exist')
  }
}

export default new EspeciesPage()
