/**
 * Step Definitions — Filmes
 * Feature: cypress/bdd/features/filmes/filmes.feature
 */
import { When, Then } from '@badeball/cypress-cucumber-preprocessor'
import FilmesPage from '../../pages/FilmesPage'

When('busco pelo filme {string}', (termo) => {
  FilmesPage.buscarPeloTitulo(termo)
})

Then('devo ver um único filme com o título {string}', (titulo) => {
  FilmesPage.verificarUnicoFilmeComTitulo(titulo)
})
