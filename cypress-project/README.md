# Testes de Interface — Codex Estelar (Cypress + BDD)

Suíte de testes de interface do **Codex Estelar**, escrita em **Cypress 13**
com **BDD (Gherkin/Cucumber)** e **Page Object Model (POM)** — a mesma
abordagem usada em aula (repositório de referência da disciplina S07,
`cypress-project/`), aqui aplicada ao nosso próprio site em vez de um
site de terceiros.

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- Repositório clonado com o site (`index.html`, `css/`, `js/`) na raiz,
  um nível acima desta pasta

## Instalação

```bash
cd cypress-project
npm install
```

## Como executar

```bash
# Sobe o servidor local e roda a suíte BDD headless, tudo em um comando
npm test

# Alternativa em dois passos, caso o comando acima não funcione no seu
# terminal (ex.: alguns ambientes têm problema com o start-server-and-test):
npm run servidor        # terminal 1 — mantém rodando
npm run test:bdd        # terminal 2

# Modo interativo (abre a interface do Cypress) — precisa do servidor rodando
npm run servidor        # terminal 1
npm run abrir:bdd       # terminal 2
```

## Relatório

Cada execução de `test:bdd` gera um relatório HTML em
`cypress-project/relatorio/index.html` (via `cypress-mochawesome-reporter`).
Abra esse arquivo no navegador para ver o resultado detalhado.

## Estrutura

```
cypress-project/
├── cypress.bdd.config.js       # config do Cypress (baseUrl, reporter, plugin do Cucumber)
├── cypress/
│   ├── bdd/
│   │   ├── features/<funcionalidade>/<funcionalidade>.feature   # cenários em Gherkin (pt-BR)
│   │   └── step_definitions/                                    # implementação dos passos
│   ├── pages/           # Page Objects — um por view do site
│   ├── fixtures/        # dados de teste centralizados
│   └── support/         # comandos customizados e configuração global
└── package.json
```

## Convenções

- Cenários em Gherkin: `# language: pt` no topo de cada `.feature`, com
  `Funcionalidade` / `Contexto` / `Cenário` / `Dado` / `Quando` / `Então`.
- Um step "Dado que acesso a página de X" por funcionalidade, centralizado
  em `compartilhado.steps.js`.
- Seletores CSS só existem dentro dos Page Objects (`cypress/pages/`) —
  step definitions e specs nunca usam `cy.get()` com um seletor cru.
