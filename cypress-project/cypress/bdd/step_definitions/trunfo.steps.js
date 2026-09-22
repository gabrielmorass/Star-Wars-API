/**
 * Step Definitions — Super Trunfo (interface)
 * Features: cypress/bdd/features/trunfo/*.feature
 *
 * Os cenários passam a query string na frente ("?seed=…", "?maos=…") porque
 * o jogo é determinístico: mesma semente e mesmas mãos, mesmo resultado.
 * Nenhum cenário depende de sorte nem de espera por tempo.
 */
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'
import HubPage from '../../pages/HubPage'
import TrunfoPage from '../../pages/TrunfoPage'

// =============================================================================
// DADO — Contexto
// =============================================================================

Given('que abro o Super Trunfo', () => {
  TrunfoPage.acessar()
})

Given('que abro o Super Trunfo com {string}', (parametros) => {
  TrunfoPage.acessar(parametros)
})

// =============================================================================
// QUANDO — Ações
// =============================================================================

When('começo uma partida contra o computador', () => {
  TrunfoPage.comecarContraComputador()
})

When('começo uma partida de dois jogadores no mesmo aparelho', () => {
  TrunfoPage.comecarDoisJogadores()
})

When('informo {string} e {string} como nomes dos jogadores', (nomeJ1, nomeJ2) => {
  TrunfoPage.digitarNomes(nomeJ1, nomeJ2)
})

When('escolho o atributo {string}', (chave) => {
  TrunfoPage.escolherAtributo(chave)
})

When('passo para a próxima rodada', () => {
  TrunfoPage.passarRodada()
})

When('confirmo que estou pronto', () => {
  TrunfoPage.confirmarQueEstaPronto()
})

When('escolho jogar de novo', () => {
  TrunfoPage.jogarDeNovo()
})

// Teclado — nenhum destes passos usa o mouse
When('levo o foco para o botão de jogar contra o computador', () => {
  TrunfoPage.focarBotaoContraComputador()
})

When('aciono o controle em foco', () => {
  TrunfoPage.acionarOFoco()
})

// =============================================================================
// ENTÃO — Verificações
// =============================================================================

Then('o Hub deve continuar com exatamente {int} cards', (quantidade) => {
  HubPage.cards.should('have.length', quantidade)
})

Then('o placar deve ser {int} a {int}', (cartasJ1, cartasJ2) => {
  TrunfoPage.verificarPlacar(cartasJ1, cartasJ2)
})

Then('o monte de empate deve ter {int} cartas', (quantidade) => {
  TrunfoPage.verificarMonteDeEmpate(quantidade)
})

Then('as cartas em jogo devem somar {int}', (total) => {
  TrunfoPage.verificarTotalDeCartas(total)
})

Then('a carta de {string} deve estar virada', (jogador) => {
  TrunfoPage.verificarCartaVirada(jogador)
})

Then('a carta de {string} deve estar aberta', (jogador) => {
  TrunfoPage.verificarCartaAberta(jogador)
})

Then('a carta de {string} deve ser a nave {string}', (jogador, nave) => {
  TrunfoPage.verificarNaveDaCarta(jogador, nave)
})

Then('a carta de {string} deve trazer o selo de Super Trunfo', (jogador) => {
  TrunfoPage.verificarSeloDeSuperTrunfo(jogador)
})

Then('o atributo {string} deve estar desabilitado', (chave) => {
  TrunfoPage.verificarAtributoDesabilitado(chave)
})

Then('o atributo {string} deve estar disponível', (chave) => {
  TrunfoPage.verificarAtributoHabilitado(chave)
})

Then('o atributo {string} deve mostrar {string}', (chave, valor) => {
  TrunfoPage.verificarValorDoAtributo(chave, valor)
})

Then('o resultado da rodada deve conter {string}', (trecho) => {
  TrunfoPage.verificarResultado(trecho)
})

Then('a indicação da vez deve conter {string}', (trecho) => {
  TrunfoPage.verificarVez(trecho)
})

Then('devo ver a cobertura pedindo o aparelho para {string}', (nome) => {
  TrunfoPage.verificarCoberturaPedindoOAparelhoPara(nome)
})

Then('a cobertura não deve mais aparecer', () => {
  TrunfoPage.verificarCoberturaAusente()
})

Then('nenhuma das duas cartas deve estar visível', () => {
  TrunfoPage.verificarNenhumaCartaVisivel()
})

Then('devo ver a tela inicial do Super Trunfo', () => {
  TrunfoPage.verificarTelaInicial()
})

Then('a tela de fim de partida deve conter {string}', (trecho) => {
  TrunfoPage.verificarTelaDeFim(trecho)
})

Then('o foco deve estar num atributo disponível', () => {
  TrunfoPage.verificarFocoEmAtributoDisponivel()
})

Then('o foco deve estar no botão de próxima rodada', () => {
  TrunfoPage.verificarFocoEmProximaRodada()
})

Then('o foco deve estar no botão de jogar de novo', () => {
  TrunfoPage.verificarFocoEmJogarDeNovo()
})
