/**
 * Step Definitions — Filmes
 * Features: cypress/bdd/features/filmes/
 *   - filmes.feature                 (busca)
 *   - posteres-e-cronologia.feature  (grade de pôsteres, ordenação, cronologia)
 *   - modal-abertura.feature         (modal, abas e texto de abertura)
 */
import { When, Then } from '@badeball/cypress-cucumber-preprocessor'
import FilmesPage from '../../pages/FilmesPage'

// =============================================================================
// QUANDO — Ações
// =============================================================================

When('busco pelo filme {string}', (termo) => {
  FilmesPage.buscarPeloTitulo(termo)
})

When('ordeno os filmes por {string}', (ordem) => {
  FilmesPage.ordenarPor(ordem)
})

When('abro o primeiro filme', () => {
  FilmesPage.abrirPrimeiroFilme()
})

When('clico no primeiro ponto da cronologia', () => {
  FilmesPage.abrirPeloPontoDaCronologia(0)
})

When('abro a aba {string}', (nome) => {
  FilmesPage.abrirAba(nome)
})

When('pauso o crawl', () => {
  FilmesPage.pausarOuRetomarCrawl()
})

// =============================================================================
// ENTÃO — Verificações
// =============================================================================

Then('devo ver um único filme com o título {string}', (titulo) => {
  FilmesPage.verificarUnicoFilmeComTitulo(titulo)
})

Then('devo ver {int} filmes na grade', (quantidade) => {
  FilmesPage.verificarQuantidadeDeFilmes(quantidade)
})

Then('todo pôster deve ter arte em SVG, sem imagem externa', () => {
  FilmesPage.verificarPosteresSemImagemExterna()
})

Then('o primeiro filme deve ser {string}', (titulo) => {
  FilmesPage.cards.first().should('contain.text', titulo)
})

Then('o modal do filme deve ser {string}', (titulo) => {
  FilmesPage.verificarTituloNoModal(titulo)
})

Then('o texto de abertura deve estar no DOM', () => {
  FilmesPage.verificarCrawlTemTexto()
})

Then('o texto de abertura deve conter {string}', (trecho) => {
  FilmesPage.verificarCrawlNoDom(trecho)
})

Then('devo ver o elenco carregado', () => {
  FilmesPage.verificarElencoCarregado()
})

Then('devo ver os planetas carregados', () => {
  FilmesPage.verificarPlanetasCarregados()
})

Then('o crawl deve estar pausado', () => {
  FilmesPage.verificarCrawlPausado()
})

Then('o crawl deve estar rodando', () => {
  FilmesPage.verificarCrawlRodando()
})
