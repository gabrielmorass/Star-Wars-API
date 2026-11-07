/**
 * Page Object da view Super Trunfo.
 * Seletores e ações desta página ficam centralizados aqui — os step
 * definitions e specs nunca acessam seletores CSS diretamente.
 *
 * Os parâmetros de URL (`?seed=`, `?cpuDelay=0`, `?maos=`) existem só para
 * teste e depuração: são eles que tornam cada cenário determinístico, em vez
 * de depender de uma semente sortuda. Ver README da raiz.
 *
 * O modo online é testado com `?transporte=fake`: o "oponente" é um roteiro
 * injetado em `window.__trunfoFake` antes de a página carregar, e tudo o
 * que o cliente envia fica gravado em `window.__trunfoFake.enviadas`.
 */
class TrunfoPage {
  // Seletores
  get raiz() {
    return cy.get('#trunfo')
  }

  get botaoContraComputador() {
    return cy.get('#trunfo-modo-cpu')
  }

  get botaoDoisJogadores() {
    return cy.get('#trunfo-modo-local')
  }

  get campoNomeJ1() {
    return cy.get('#trunfo-nome-j1')
  }

  get campoNomeJ2() {
    return cy.get('#trunfo-nome-j2')
  }

  get vez() {
    return cy.get('#trunfo-vez')
  }

  get resultado() {
    return cy.get('#trunfo-resultado')
  }

  get monteDeEmpate() {
    return cy.get('#trunfo-empate')
  }

  get botaoProximaRodada() {
    return cy.get('#trunfo-proxima')
  }

  get cobertura() {
    return cy.get('#trunfo-passe')
  }

  get botaoEstouPronto() {
    return cy.get('#trunfo-pronto')
  }

  get botaoJogarDeNovo() {
    return cy.get('#trunfo-jogar-novamente')
  }

  carta(jogador) {
    return cy.get(`#trunfo-carta-${jogador}`)
  }

  placar(jogador) {
    return cy.get(`#trunfo-placar-${jogador}`)
  }

  atributo(chave) {
    return cy.get(`.trunfo-atributo[data-attr="${chave}"]`)
  }

  // Seletores — modo online
  get botaoOnline() {
    return cy.get('#trunfo-modo-online')
  }

  get botaoCriarSala() {
    return cy.get('#trunfo-criar-sala')
  }

  get botaoEntrarSala() {
    return cy.get('#trunfo-entrar-sala')
  }

  get campoCodigo() {
    return cy.get('#trunfo-codigo-input')
  }

  get codigoSala() {
    return cy.get('#trunfo-codigo-sala')
  }

  get conexao() {
    return cy.get('#trunfo-conexao')
  }

  get erroOnline() {
    return cy.get('#trunfo-erro-online')
  }

  get botaoSairSala() {
    return cy.get('#trunfo-sair-sala')
  }

  get aguardando() {
    return cy.get('#trunfo-aguardando')
  }

  get pausa() {
    return cy.get('#trunfo-pausa')
  }

  get atributos() {
    return cy.get('.trunfo-atributo')
  }

  // Ações
  /**
   * Abre a view pelo botão da barra de navegação (não pelo Hub: o Super
   * Trunfo de propósito NÃO tem um `.hub-card`, para o Hub continuar com
   * exatamente cinco).
   *
   * @param {string} [parametros] query string, ex.: '?seed=1977&cpuDelay=0'
   */
  acessar(parametros = '') {
    cy.visit(`/${parametros}`)
    cy.get('.topnav [data-nav="trunfo"]').click()
    this.botaoContraComputador.should('be.visible')
  }

  digitarNomes(nomeJ1, nomeJ2) {
    this.campoNomeJ1.clear().type(nomeJ1)
    this.campoNomeJ2.clear().type(nomeJ2)
  }

  comecarContraComputador() {
    this.botaoContraComputador.click()
    this.carta('j1').should('exist')
  }

  comecarDoisJogadores() {
    this.botaoDoisJogadores.click()
    this.carta('j1').should('exist')
  }

  escolherAtributo(chave) {
    this.atributo(chave).click()
  }

  passarRodada() {
    this.botaoProximaRodada.click()
  }

  confirmarQueEstaPronto() {
    this.botaoEstouPronto.click()
  }

  jogarDeNovo() {
    this.botaoJogarDeNovo.click()
  }

  // Ações — modo online
  /**
   * Abre o Super Trunfo com o transporte fake e o roteiro do oponente já
   * no lugar: o objeto precisa existir ANTES de o app carregar.
   */
  acessarComOponenteFake(parametros, fake) {
    cy.visit(`/${parametros}`, {
      onBeforeLoad(win) {
        win.__trunfoFake = fake
        cy.spy(win.console, 'warn').as('avisosDoConsole')
      },
    })
    cy.get('.topnav [data-nav="trunfo"]').click()
    this.botaoContraComputador.should('be.visible')
  }

  /**
   * Recarrega a página no meio da partida. Com a sessão online guardada, o
   * app abre o Super Trunfo sozinho — por isso aqui não há clique na barra.
   */
  recarregarComOponenteFake(fake) {
    cy.location('search').then((search) => {
      cy.visit(`/${search}`, {
        onBeforeLoad(win) {
          win.__trunfoFake = fake
        },
      })
    })
  }

  informarMeuNome(nome) {
    this.campoNomeJ1.clear().type(nome)
  }

  criarSala() {
    this.botaoOnline.click()
    this.botaoCriarSala.click()
    this.codigoSala.should('be.visible')
  }

  entrarNaSala(codigo) {
    this.botaoOnline.click()
    this.campoCodigo.clear().type(codigo)
    this.botaoEntrarSala.click()
  }

  esperarPartidaOnline() {
    this.carta('j1').should('exist')
    this.placar('j1').should('have.text', '18')
  }

  /** O "oponente" envia uma mensagem agora. */
  oponenteEnvia(mensagem) {
    cy.window().its('__trunfoFake.injetar').should('be.a', 'function')
    cy.window().then((win) => win.__trunfoFake.injetar(mensagem))
  }

  /** O "oponente" entra ("entrar") ou sai ("sair") da sala. */
  presencaDoOponente(acao) {
    cy.window().then((win) => win.__trunfoFake.presenca(acao))
  }

  /** Cópia das mensagens que o cliente enviou até agora. */
  mensagensEnviadas() {
    return cy
      .window()
      .its('__trunfoFake.enviadas')
      .then((lista) => JSON.parse(JSON.stringify(lista)))
  }

  // Ações por teclado — sem mouse em nenhum passo
  focarBotaoContraComputador() {
    this.botaoContraComputador.focus()
  }

  acionarOFoco() {
    cy.focused().type('{enter}')
  }

  // Verificações
  verificarPlacar(cartasJ1, cartasJ2) {
    this.placar('j1').should('have.text', String(cartasJ1))
    this.placar('j2').should('have.text', String(cartasJ2))
  }

  verificarMonteDeEmpate(quantidade) {
    this.monteDeEmpate.should('have.text', String(quantidade))
  }

  /**
   * Invariante do baralho: nenhuma carta se perde nem se duplica. Tudo que
   * saiu da mão de alguém está na mão do outro ou no monte de empate.
   */
  verificarTotalDeCartas(total) {
    this.placar('j1')
      .invoke('text')
      .then((j1) =>
        this.placar('j2')
          .invoke('text')
          .then((j2) =>
            this.monteDeEmpate.invoke('text').then((monte) => {
              cy.wrap(Number(j1) + Number(j2) + Number(monte)).should('eq', total)
            })
          )
      )
  }

  verificarCartaVirada(jogador) {
    this.carta(jogador).should('have.class', 'trunfo-verso')
    this.carta(jogador).find('.trunfo-nome').should('not.exist')
  }

  verificarCartaAberta(jogador) {
    this.carta(jogador).should('not.have.class', 'trunfo-verso')
    this.carta(jogador).find('.trunfo-nome').should('exist')
  }

  verificarNaveDaCarta(jogador, nome) {
    this.carta(jogador).find('.trunfo-nome').should('have.text', nome)
  }

  verificarSeloDeSuperTrunfo(jogador) {
    this.carta(jogador).find('.trunfo-super').should('have.text', 'SUPER TRUNFO')
  }

  verificarAtributoDesabilitado(chave) {
    this.atributo(chave).should('be.disabled')
  }

  verificarAtributoHabilitado(chave) {
    this.atributo(chave).should('not.be.disabled')
  }

  verificarValorDoAtributo(chave, valor) {
    this.atributo(chave).should('contain.text', valor)
  }

  verificarResultado(trecho) {
    this.resultado.should('contain.text', trecho)
  }

  verificarVez(trecho) {
    this.vez.should('contain.text', trecho)
  }

  verificarCoberturaPedindoOAparelhoPara(nome) {
    this.cobertura.should('be.visible').and('contain.text', `Passe o aparelho para ${nome}`)
  }

  verificarCoberturaAusente() {
    this.cobertura.should('not.be.visible')
  }

  /**
   * Com a cobertura no ar, nenhuma das duas cartas pode estar visível — e o
   * nome da nave não pode nem estar no DOM, senão bastaria olhar o HTML.
   */
  verificarNenhumaCartaVisivel() {
    this.carta('j1').should('not.be.visible')
    this.carta('j2').should('not.be.visible')
    cy.get('.trunfo-nome').should('not.exist')
  }

  verificarTelaInicial() {
    this.botaoContraComputador.should('be.visible')
    this.botaoDoisJogadores.should('be.visible')
    cy.get('#trunfo-carta-j1').should('not.exist')
  }

  verificarTelaDeFim(trecho) {
    this.botaoJogarDeNovo.should('be.visible')
    this.raiz.should('contain.text', trecho)
  }

  verificarFocoEmAtributoDisponivel() {
    cy.focused().should('have.class', 'trunfo-atributo').and('not.be.disabled')
  }

  verificarFocoEmProximaRodada() {
    cy.focused().should('have.id', 'trunfo-proxima')
  }

  verificarFocoEmJogarDeNovo() {
    cy.focused().should('have.id', 'trunfo-jogar-novamente')
  }

  verificarSemBotoesDeAtributo() {
    this.atributos.should('not.exist')
  }

  // Verificações — modo online
  verificarBotaoOnlineAusente() {
    this.botaoContraComputador.should('be.visible')
    this.botaoOnline.should('not.exist')
  }

  verificarCodigoDaSala(alfabeto, tamanho) {
    this.codigoSala
      .invoke('text')
      .should('match', new RegExp(`^[${alfabeto}]{${tamanho}}$`))
  }

  verificarConexao(texto) {
    this.conexao.should('have.text', texto)
  }

  verificarErroOnline(texto) {
    this.erroOnline.should('be.visible').and('have.text', texto)
  }

  verificarSemPartida() {
    cy.get('#trunfo-carta-j1').should('not.exist')
    cy.get('#trunfo-carta-j2').should('not.exist')
  }

  verificarPausa(texto) {
    this.pausa.should('be.visible').and('contain.text', texto)
  }

  verificarAtributosTravados() {
    this.atributos.should('have.length.greaterThan', 0).each(($botao) => {
      cy.wrap($botao).should('be.disabled')
    })
  }

  verificarProximaVisivel() {
    this.botaoProximaRodada.should('be.visible')
    this.aguardando.should('not.be.visible')
  }

  verificarAguardando(texto) {
    this.botaoProximaRodada.should('not.be.visible')
    this.aguardando.should('be.visible').and('have.text', texto)
  }

  /** Alguma mensagem enviada contém estes campos? (comparação por subconjunto) */
  verificarMensagemEnviada(parcial) {
    this.mensagensEnviadas().should((lista) => {
      const contem = (inteiro, parte) =>
        parte !== null && typeof parte === 'object'
          ? inteiro !== null &&
            typeof inteiro === 'object' &&
            Object.keys(parte).every((k) => contem(inteiro[k], parte[k]))
          : inteiro === parte
      expect(
        lista.some((m) => contem(m, parcial)),
        `mensagem enviada contendo ${JSON.stringify(parcial)}`
      ).to.eq(true)
    })
  }

  /**
   * Uma jogada repetida tem que parar no `seq`, antes de chegar às regras:
   * se chegasse, as regras a recusariam e o console registraria isso.
   */
  verificarNenhumaJogadaRecusadaPelasRegras() {
    cy.get('@avisosDoConsole').should((spy) => {
      const recusas = spy.getCalls().filter((chamada) =>
        String(chamada.args[0]).includes('recusada pelas regras')
      )
      expect(recusas, 'ações remotas recusadas pelas regras').to.have.length(0)
    })
  }

  verificarNenhumaMensagemDoTipo(tipo) {
    this.mensagensEnviadas().should((lista) => {
      expect(lista.filter((m) => m.tipo === tipo)).to.have.length(0)
    })
  }
}

export default new TrunfoPage()
