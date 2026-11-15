import { Given, Then } from '@badeball/cypress-cucumber-preprocessor'
import EspeciesPage from '../../pages/EspeciesPage'

function origemDoSite() {
  return new URL(Cypress.config('baseUrl')).origin
}

Given('que acesso Espécies pelo BFF real', () => {
  const origem = origemDoSite()
  // Apenas observa: a resposta percorre o proxy, o BFF e a SWAPI reais.
  cy.intercept('GET', `${origem}/api/species?idioma=pt-BR`).as('especiesBffReal')
  cy.intercept('GET', `${origem}/api/planets/*`).as('planetaBffReal')
  cy.intercept('GET', 'https://swapi.info/api/**').as('swapiDireta')

  EspeciesPage.acessar()
  cy.wait('@especiesBffReal').then(({ response }) => {
    expect(response.statusCode).to.eq(200)
    expect(response.body).to.be.an('array').and.not.be.empty
    const humano = response.body.find((especie) => especie.name === 'Human')
    expect(humano, 'Human retornado pelo BFF').to.be.an('object')
    expect(humano.ptBR, 'apresentação pt-BR do servidor').to.be.an('object')
    expect(humano.ptBR.classification).to.be.a('string').and.not.be.empty
    expect(humano.ptBR.designation).to.be.a('string').and.not.be.empty
    expect(humano.homeworld).to.be.a('string').and.not.be.empty
    cy.wrap(humano).as('humanoBff', { type: 'static' })
  })
})

Given('que o BFF de Espécies responde com erro', () => {
  cy.intercept('GET', 'https://swapi.info/api/**').as('swapiDireta')
  cy.intercept('GET', `${origemDoSite()}/api/species?idioma=pt-BR`, {
    statusCode: 503,
    body: { erro: 'BFF indisponível para este cenário' },
  }).as('falhaEspeciesBff')
  cy.irParaFuncionalidade('species')
  cy.wait('@falhaEspeciesBff').its('response.statusCode').should('eq', 503)
})

Then('devo ver a apresentação retornada pelo BFF real', () => {
  cy.get('@humanoBff').then((especie) => {
    EspeciesPage.verificarApresentacaoDoBff(especie)
  })
})

Then('o planeta natal deve ser carregado pelo BFF real', () => {
  cy.get('@humanoBff').then((especie) => {
    cy.wait('@planetaBffReal').then(({ request, response }) => {
      expect(new URL(request.url).origin).to.eq(origemDoSite())
      expect(new URL(request.url).pathname).to.eq(new URL(especie.homeworld).pathname)
      expect(response.statusCode).to.eq(200)
      expect(response.body.name).to.be.a('string').and.not.be.empty
      EspeciesPage.verificarPlanetaNatalNoDetalhe(response.body.name)
    })
  })
})

Then('nenhuma consulta direta à SWAPI deve ser feita', () => {
  cy.get('@swapiDireta.all').should('have.length', 0)
})
