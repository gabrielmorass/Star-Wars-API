/**
 * Page Object da view Personagens.
 * Seletores e ações desta página ficam centralizados aqui — os step
 * definitions e specs nunca acessam seletores CSS diretamente.
 * filtros.feature (filtros por espécie e por filme)
 */
class PersonagensPage {
  // Seletores
  get campoBusca() {
    return cy.get('#people-search')
  }

  get cards() {
    return cy.get('.person-card')
  }

  get contador() {
    return cy.get('.people-count')
  }

  get seletorOrdem() {
    return cy.get('#people-sort')
  }

  get botaoLinhaDoTempo() {
    return cy.get('[data-mode="timeline"]')
  }

  get grade() {
    return cy.get('#people-grid')
  }

  get avataresComAno() {
    return cy.get('.tl-people > .tl-person')
  }

  get avataresSemAno() {
    return cy.get('.tl-person--sem')
  }

  get modal() {
    return cy.get('.modal-person')
  }

  get conexoes() {
    return cy.get('.conn-item')
  }

  get seletorFilme() {
    return cy.get('#people-film')
  }

  get botaoEscopoDaLinhaDoTempo() {
    return cy.get('.tl-scope')
  }

  get chipDosAnteriores() {
    return cy.get('.tl-older')
  }

  get botaoFecharModal() {
    return cy.get('.modal-person .modal-close')
  }

  get pillPlanetaNatal() {
    return cy.get('#modal-homeworld')
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

  limparBusca() {
    this.campoBusca.clear()
  }

  abrirPrimeiroResultado() {
    this.cards.first().click()
  }

  abrirLinhaDoTempo() {
    this.botaoLinhaDoTempo.click()
    // o painel do eixo só existe depois que o modo troca
    cy.get('.tl-frame').should('exist')
  }

  ordenarPor(criterio) {
    this.seletorOrdem.select(criterio)
  }

  filtrarPorEspecie(chave) {
    cy.get(`[data-filter="${chave}"]`).click()
    cy.get(`[data-filter="${chave}"]`).should('have.class', 'is-on')
  }

  filtrarPorFilme(rotulo) {
    this.seletorFilme.select(rotulo)
  }

  abrirPrimeiroDaLinhaDoTempo() {
    this.avataresComAno.first().click()
  }

  abrirPrimeiraConexao() {
    this.conexoes.first().click()
  }

  ampliarLinhaDoTempo() {
    this.botaoEscopoDaLinhaDoTempo.click()
    // o eixo é remontado; o botão troca de rótulo quando termina
    this.botaoEscopoDaLinhaDoTempo.should('contain.text', 'Focar')
  }

  fecharModal() {
    this.botaoFecharModal.click()
  }

  pressionarEsc() {
    cy.get('body').type('{esc}')
  }

  pressionarSetaDireita() {
    cy.get('body').type('{rightarrow}')
  }

  /**
   * O planeta natal é resolvido sob demanda (a SWAPI só dá a URL): espera
   * o "Carregando…" virar nome antes de clicar.
   */
  abrirPlanetaNatal() {
    this.pillPlanetaNatal.should('not.contain.text', 'Carregando').click()
  }

  // Verificações
  verificarQuantidadeDeCards(quantidadeEsperada) {
    this.cards.should('have.length', quantidadeEsperada)
  }

  verificarCardComNome(nome) {
    this.cards.should('have.length', 1).and('contain.text', nome)
  }

  /**
   * Na linha do tempo o contador não fala de "personagens", e sim de quem
   * tem ano de nascimento conhecido — só esses cabem no eixo. Conferimos o
   * formato e a coerência com o que está desenhado, e não números fixos:
   * a SWAPI é externa e pode mudar.
   */
  verificarContadorDaLinhaDoTempo() {
    this.contador
      .invoke('text')
      .should('match', /^\d+ com ano · \d+ desconhecidos?$/)
  }

  /**
   * Invariante da linha do tempo: todo personagem com ano conhecido está
   * em UM de três lugares — desenhado no eixo, dobrado num agrupador "+N",
   * ou atrás do chip dos que nasceram antes do início do trecho em foco
   * (o eixo abre em 120BBY; Yoda, Jabba e Chewbacca ficam fora dele).
   * Somados, têm que dar exatamente o "com ano" do contador.
   */
  verificarCoerenciaDoContador() {
    this.contador.invoke('text').then((texto) => {
      const [, comAno, semAno] = texto.match(/^(\d+) com ano · (\d+) desconhecidos?$/)
      this.avataresSemAno.should('have.length', Number(semAno))

      cy.get('body').then(($body) => {
        const chip = $body.find('.tl-older')
        const foraDoFoco = chip.length ? Number(chip.text().match(/\d+/)[0]) : 0
        cy.get('.tl-people > .tl-person, .tl-fanned').should(
          'have.length',
          Number(comAno) - foraDoFoco
        )
      })
    })
  }

  verificarEixoVazio() {
    this.avataresComAno.should('have.length', 0)
  }

  verificarContadorComAno(quantidade) {
    this.contador.invoke('text').should('match', new RegExp(`^${quantidade} com ano · `))
  }

  /**
   * Com um filtro ativo, a linha do tempo conta a MESMA lista da grade:
   * "com ano" + "desconhecidos" tem que dar o número de cards que a grade
   * mostrava antes de trocar de modo.
   */
  verificarSomaDoContadorIgualA(alias) {
    cy.get(`@${alias}`).then((quantidadeEsperada) => {
      this.contador.invoke('text').then((texto) => {
        const [, comAno, semAno] = texto.match(/^(\d+) com ano · (\d+) desconhecidos?$/)
        cy.wrap(Number(comAno) + Number(semAno)).should('eq', quantidadeEsperada)
      })
    })
  }

  verificarChipDosAnterioresAusente() {
    this.chipDosAnteriores.should('not.exist')
  }

  /** Cada avatar do eixo tem aria-label "Nome — ano". */
  verificarNoEixo(nome) {
    cy.get(`.tl-people > .tl-person[aria-label^="${nome}"]`).should('exist')
  }

  verificarModalFechado() {
    this.modal.should('not.exist')
  }

  verificarGradeEscondida() {
    this.grade.should('not.be.visible')
  }

  verificarPrimeiroCard(nome) {
    this.cards.first().should('contain.text', nome)
  }

  verificarNomeNoModal(nome) {
    this.modal.find('h3').should('have.text', nome)
  }

  verificarModalAberto() {
    this.modal.should('exist')
  }

  guardarQuantidadeAtual(alias) {
    this.cards.its('length').then((quantidade) => {
      cy.wrap(quantidade).as(alias)
    })
  }

  verificarQuantidadeMudouEmRelacaoA(alias) {
    cy.get(`@${alias}`).then((quantidadeAnterior) => {
      this.cards.its('length').should('not.eq', quantidadeAnterior)
    })
  }

  verificarQuantidadeIgualA(alias) {
    cy.get(`@${alias}`).then((quantidadeEsperada) => {
      this.cards.should('have.length', quantidadeEsperada)
    })
  }

  verificarTodosCardsDaEspecie(nomeEspecie) {
    this.cards.should('have.length.greaterThan', 0)
    this.cards.each(($card) => {
      // a espécie é preenchida sob demanda (IntersectionObserver)
      cy.wrap($card).scrollIntoView()
      cy.wrap($card).find('.person-species').should('have.text', nomeEspecie)
    })
  }
}

export default new PersonagensPage()
