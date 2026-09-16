/**
 * Step Definitions — Personagens
 * Features: cypress/bdd/features/personagens/
 *   - personagens.feature        (busca)
 *   - linha-do-tempo.feature     (modo linha do tempo)
 *   - ordenacao-e-modal.feature  (ordenação da grade e conexões do modal)
 */
import { When, Then } from '@badeball/cypress-cucumber-preprocessor'
import PersonagensPage from '../../pages/PersonagensPage'

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
