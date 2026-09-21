import { When } from '@badeball/cypress-cucumber-preprocessor'
import PersonagensPage from '../../pages/PersonagensPage'

When('busco por um texto de {int} caracteres', (quantidade) => {
  PersonagensPage.buscarPorNome('a'.repeat(quantidade))
})

When('limpo o campo de busca', () => {
  PersonagensPage.limparBusca()
})