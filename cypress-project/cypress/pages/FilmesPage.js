/**
 * Page Object da view Filmes.
 */
class FilmesPage {
  // Seletores
  get campoBusca() {
    return cy.get('#films-search')
  }

  get cards() {
    return cy.get('#films-grid .info-card')
  }

  get pontosDaCronologia() {
    return cy.get('.sb-dot')
  }

  get modal() {
    return cy.get('.modal-film')
  }

  get crawl() {
    return cy.get('.film-crawl')
  }

  get abas() {
    return cy.get('.fm-tab')
  }

  get botaoFechar() {
    return cy.get('.modal-close')
  }

  // Ações
  acessar() {
    cy.irParaFuncionalidade('films')
    this.cards.should('have.length.greaterThan', 0)
  }

  buscarPeloTitulo(termo) {
    this.campoBusca.clear().type(termo)
  }

  ordenarPor(ordem) {
    cy.get(`[data-order="${ordem}"]`).click()
  }

  abrirPrimeiroFilme() {
    this.cards.first().click()
    this.modal.should('exist')
  }

  abrirPeloPontoDaCronologia(indice) {
    this.pontosDaCronologia.eq(indice).click()
    this.modal.should('exist')
  }

  abrirAba(nome) {
    cy.get(`.fm-tab[data-panel="${nome}"]`).click()
  }

  pausarOuRetomarCrawl() {
    cy.get('[data-act="toggle"]').click()
  }

  fecharModal() {
    this.botaoFechar.click()
  }

  // Verificações
  verificarUnicoFilmeComTitulo(titulo) {
    this.cards.should('have.length', 1).and('contain.text', titulo)
  }

  verificarQuantidadeDeFilmes(quantidade) {
    this.cards.should('have.length', quantidade)
  }

  /**
   * A arte dos pôsteres é desenhada em SVG no próprio projeto; nenhum card
   * pode depender de imagem externa.
   */
  verificarPosteresSemImagemExterna() {
    this.cards.each(($card) => {
      cy.wrap($card).find('.fc-art svg').should('exist')
    })
    cy.get('#films-grid img').should('not.exist')
  }

  verificarOrdemDosTitulos(titulos) {
    this.cards.should('have.length', titulos.length)
    titulos.forEach((titulo, i) => {
      this.cards.eq(i).should('contain.text', titulo)
    })
  }

  verificarTituloNoModal(titulo) {
    this.modal.find('h3').should('have.text', titulo)
  }

  /**
   * O texto de abertura completo tem que estar sempre no DOM dentro de
   * .film-crawl, independente da aba aberta ou de a animação estar rodando —
   * a animação só transforma o bloco, nunca troca o conteúdo.
   */
  verificarCrawlNoDom(trecho) {
    this.crawl.should('contain.text', trecho)
  }

  verificarCrawlTemTexto() {
    this.crawl.invoke('text').should('have.length.greaterThan', 100)
  }

  verificarAbaAtiva(nome) {
    cy.get('.fm-tab.is-on').should('have.text', nome)
  }

  verificarElencoCarregado() {
    cy.get('.fm-person').should('have.length.greaterThan', 0)
  }

  verificarPlanetasCarregados() {
    cy.get('.fm-planet').should('have.length.greaterThan', 0)
  }

  verificarCrawlPausado() {
    cy.get('.film-crawl-stage').should('have.class', 'is-paused')
    cy.get('[data-act="toggle"]').should('have.text', 'Retomar')
  }

  verificarCrawlRodando() {
    cy.get('.film-crawl-stage').should('not.have.class', 'is-paused')
    cy.get('[data-act="toggle"]').should('have.text', 'Pausar')
  }
}

export default new FilmesPage()
