/**
 * Step Definitions — Personagens
 * Features: cypress/bdd/features/personagens/
 *   - personagens.feature        (busca)
 *   - linha-do-tempo.feature     (modo linha do tempo)
 *   - ordenacao-e-modal.feature  (ordenação da grade e conexões do modal)
 */
import { When, Then } from '@badeball/cypress-cucumber-preprocessor'
import PersonagensPage from '../../pages/PersonagensPage'
import PlanetasPage from '../../pages/PlanetasPage'

// =============================================================================
// QUANDO — Ações
// =============================================================================

When('busco por {string}', (termo) => {
  PersonagensPage.buscarPorNome(termo)
})

When('abro o primeiro resultado', () => {
  PersonagensPage.abrirPrimeiroResultado()
})

When('alterno para a linha do tempo', () => {
  PersonagensPage.abrirLinhaDoTempo()
})

When('ordeno os personagens por {string}', (criterio) => {
  PersonagensPage.ordenarPor(criterio)
})

When('abro o primeiro personagem do eixo', () => {
  PersonagensPage.abrirPrimeiroDaLinhaDoTempo()
})

When('abro a primeira conexão do modal', () => {
  PersonagensPage.abrirPrimeiraConexao()
})

When('filtro personagens por espécie {string}', (chave) => {
  PersonagensPage.filtrarPorEspecie(chave)
})

When('filtro personagens pelo filme {string}', (rotulo) => {
  PersonagensPage.filtrarPorFilme(rotulo)
})

When('guardo a quantidade atual de cards', () => {
  PersonagensPage.guardarQuantidadeAtual('quantidadeOriginal')
})

When('amplio a linha do tempo para ver tudo', () => {
  PersonagensPage.ampliarLinhaDoTempo()
})

When('fecho o modal do personagem', () => {
  PersonagensPage.fecharModal()
})

When('pressiono a tecla Esc', () => {
  PersonagensPage.pressionarEsc()
})

When('pressiono a seta para a direita', () => {
  PersonagensPage.pressionarSetaDireita()
})

When('abro o planeta natal no modal', () => {
  PersonagensPage.abrirPlanetaNatal()
})

// =============================================================================
// ENTÃO — Verificações
// =============================================================================

Then('devo ver um único card com o nome {string}', (nome) => {
  PersonagensPage.verificarCardComNome(nome)
})

Then('a grade de cards não deve estar visível', () => {
  PersonagensPage.verificarGradeEscondida()
})

Then('devo ver o contador no formato da linha do tempo', () => {
  PersonagensPage.verificarContadorDaLinhaDoTempo()
})

Then('a contagem do contador deve bater com os avatares desenhados', () => {
  PersonagensPage.verificarCoerenciaDoContador()
})

Then('devo ver no máximo {int} personagens posicionados no eixo', (maximo) => {
  PersonagensPage.avataresComAno.should('have.length.at.most', maximo)
})

Then('o modal do personagem deve estar aberto', () => {
  PersonagensPage.verificarModalAberto()
})

Then('o primeiro card deve ser {string}', (nome) => {
  PersonagensPage.verificarPrimeiroCard(nome)
})

Then('o modal não deve mais ser de {string}', (nome) => {
  PersonagensPage.modal.find('h3').should('not.have.text', nome)
})

Then('todos os cards visíveis devem ser da espécie {string}', (nomeEspecie) => {
  PersonagensPage.verificarTodosCardsDaEspecie(nomeEspecie)
})

Then('a quantidade de cards deve ser diferente da quantidade original', () => {
  PersonagensPage.verificarQuantidadeMudouEmRelacaoA('quantidadeOriginal')
})

Then('a quantidade de cards deve voltar à quantidade original', () => {
  PersonagensPage.verificarQuantidadeIgualA('quantidadeOriginal')
})

Then('não devo ver nenhum personagem no eixo', () => {
  PersonagensPage.verificarEixoVazio()
})

Then('o contador deve indicar {int} com ano', (quantidade) => {
  PersonagensPage.verificarContadorComAno(quantidade)
})

Then('a soma do contador deve ser igual à quantidade original', () => {
  PersonagensPage.verificarSomaDoContadorIgualA('quantidadeOriginal')
})

Then('o chip dos que nasceram antes de 120BBY não deve existir', () => {
  PersonagensPage.verificarChipDosAnterioresAusente()
})

Then('devo ver {string} no eixo', (nome) => {
  PersonagensPage.verificarNoEixo(nome)
})

Then('o modal do personagem deve estar fechado', () => {
  PersonagensPage.verificarModalFechado()
})

Then('devo estar no Sistema Planetário vendo {string}', (planeta) => {
  cy.title().should('eq', 'Sistema planetário | Codex Estelar')
  PlanetasPage.verificarNomePlaneta(planeta)
})
