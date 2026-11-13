import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'
import EspeciesPage from '../../pages/EspeciesPage'

Given('que acesso Espécies com dados simulados {string}', (modo) => {
  cy.fixture('especies-ptbr').then((dados) => {
    // Os rótulos são intencionalmente diferentes dos dicionários locais:
    // assim o cenário comprova que a tela utiliza o texto recebido.
    const especies = structuredClone(dados)
    if (modo === 'sem tradução') {
      especies.forEach((especie) => { delete especie.ptBR })
    } else if (modo === 'com marcação') {
      especies[0].ptBR.classification = '<b>classe do servidor</b>'
      especies[0].ptBR.skin_colors[0].nome = '<em>pele do servidor</em>'
    }

    // Aceita a origem atual e a futura origem /api, sem configurar a
    // migração compartilhada que pertence ao Bloco E.
    cy.intercept('GET', '**/api/species*', { body: especies }).as('especiesSimuladas')
    cy.intercept('GET', '**/api/people', { body: [] })
    cy.intercept('GET', '**/api/planets/9', { body: { name: 'Coruscant' } })
    cy.intercept('GET', 'https://raw.githubusercontent.com/akabab/starwars-api/master/api/all.json', { body: [] })
    EspeciesPage.acessar()
    cy.wait('@especiesSimuladas')
    EspeciesPage.verificarQuantidade(2)
  })
})

When('filtro espécies por mamíferos', () => {
  EspeciesPage.filtrarMamiferos()
})

Then('apenas a espécie Human deve aparecer na grade', () => {
  EspeciesPage.verificarSomenteHuman()
})

Then('devo ver os textos de apresentação do servidor', () => {
  EspeciesPage.verificarTextosDoServidor()
})

Then('as amostras devem usar os valores originais e os nomes do servidor', () => {
  EspeciesPage.verificarAmostrasDoServidor()
})

Then('a tradução local de Espécies deve continuar disponível', () => {
  EspeciesPage.verificarTraducaoLocal()
})

Then('a marcação da tradução deve aparecer como texto sem criar elementos', () => {
  EspeciesPage.verificarMarcacaoComoTexto()
})

Then('as cores ausentes devem mostrar texto sem amostras', () => {
  EspeciesPage.verificarCoresAusentes()
})
