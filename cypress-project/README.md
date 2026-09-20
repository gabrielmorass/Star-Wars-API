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

## O que a suíte cobre

São **33 cenários** em 10 arquivos `.feature`, organizados por funcionalidade:

| Feature | Cenários | O que verifica |
|---|---|---|
| `hub/navegacao.feature` | 5 | cada um dos 5 cards leva à view correta (validado pelo título da página) |
| `personagens/busca.feature` | 2 | busca por nome e estado de "nenhum resultado" |
| `personagens/linha-do-tempo.feature` | 4 | troca de modo, contador, busca no eixo e abertura do modal |
| `personagens/ordenacao-e-modal.feature` | 4 | ordenação por altura/nascimento/nome e navegação por conexões |
| `filmes/busca.feature` | 2 | busca por título e estado de "nenhum resultado" |
| `filmes/posteres-e-cronologia.feature` | 4 | grade de pôsteres, arte em SVG, ordenação e barra de cronologia |
| `filmes/modal-abertura.feature` | 6 | texto de abertura no DOM, abas sob demanda e controles do crawl |
| `planetas/busca.feature` | 2 | busca que pula direto para o planeta |
| `naves-e-veiculos/busca.feature` | 2 | busca por nome |
| `especies/busca-e-detalhe.feature` | 2 | busca por nome e detalhe do planeta natal |

Convenção de nomes: cada arquivo `.feature` leva o nome da **capacidade**
que testa (`busca`, `linha-do-tempo`, `modal-abertura`...), não da view —
a pasta já diz qual view é. Um mesmo view pode ter vários arquivos
(como Personagens e Filmes, que têm 3 cada).

### Duas invariantes que vale destacar

**O texto de abertura nunca sai do DOM.** `modal-abertura.feature` verifica que
o `opening_crawl` completo continua dentro de `.film-crawl` em três situações
diferentes: logo ao abrir, com outra aba selecionada e com a animação pausada.
É o tipo de coisa que uma refatoração de animação quebra sem querer.

**A soma da linha do tempo fecha.** Todo personagem com ano conhecido está em
um de três lugares — desenhado no eixo, dobrado num agrupador `+N`, ou atrás do
chip dos que nasceram antes do trecho em foco. `verificarCoerenciaDoContador()`
soma os três e compara com o número anunciado pelo contador. Foi esse cenário
que pegou uma diferença de 3 entre o contador (43) e o que estava desenhado (40).

## Estrutura

```
cypress-project/
├── cypress.bdd.config.js       # config do Cypress (baseUrl, reporter, plugin do Cucumber)
├── cypress/
│   ├── bdd/
│   │   ├── features/<funcionalidade>/*.feature   # cenários em Gherkin (pt-BR)
│   │   └── step_definitions/                     # implementação dos passos
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
- Os testes rodam contra a **SWAPI real**, sem mock. Por isso as asserções
  evitam depender de contagens que a API pode mudar: onde o número importa,
  ele é lido da própria tela e comparado com outra parte da tela (ver
  `verificarCoerenciaDoContador`), em vez de ficar fixo no teste.
- Nada de `cy.wait(<número>)` para "esperar carregar": a espera é sempre por
  uma condição (`should`), que o Cypress reexecuta até passar ou estourar o
  timeout. É o que mantém a suíte estável — três execuções seguidas, 28/28.
