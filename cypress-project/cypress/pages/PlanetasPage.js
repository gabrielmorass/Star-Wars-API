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

  retroceder() {
    this.setaAnterior.click()
  }

  // Verificações
  verificarNomePlaneta(nome) {
    this.card.find('h3').should('contain.text', nome)
  }

  verificarPosicao(posicao) {
    this.posicao.should('contain.text', posicao)
  }

  /**
   * Confere a posição exata do carrossel (ex.: "2" em "2 / 60"). Usa
   * regex ancorado no início — diferente de verificarPosicao(), que faz
   * contain.text e daria falso positivo (ex.: "1" bateria com "21 / 60").
   */
  verificarPosicaoAtual(numero) {
    this.posicao.invoke('text').should('match', new RegExp(`^${numero} / \\d+$`))
  }

  /**
   * Invariante de contorno do carrossel: a posição atual (primeiro número)
   * é igual ao total (segundo número) — ou seja, estamos no último planeta.
   * Usado para confirmar o "dar a volta" ao retroceder a partir do primeiro.
   */
  verificarUltimoPlaneta() {
    this.posicao.invoke('text').then((texto) => {
      const [atual, total] = texto.split('/').map((parte) => parte.trim())
      cy.wrap(atual).should('eq', total)
    })
  }
}

export default new PlanetasPage()