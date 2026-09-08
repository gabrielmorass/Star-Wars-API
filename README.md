# Codex Estelar

Front-end estático (HTML + CSS + JavaScript puro, sem build) conectado à [SWAPI](https://swapi.info) — base do projeto de Qualidade de Software.

## Como rodar o site

Como `js/main.js` usa ES Modules (`import`/`export`), abrir `index.html` direto com duplo-clique (`file://`) pode ser bloqueado pelo navegador. Sirva a pasta com um servidor estático simples:

```bash
# Opção 1 — Python (já vem instalado na maioria dos sistemas)
python3 -m http.server 8080

# Opção 2 — Node
npx http-server . -p 8080
```

Depois acesse `http://localhost:8080`.

## Funcionalidades

- **Sistema planetário** — carrossel navegável (clique ou teclado) com clima, população, espécies presentes e filmes de cada planeta, com busca por nome
- **Personagens** — busca por nome, modal com espécie e planeta natal
- **Filmes** — os 6 episódios, busca por título, modal com a abertura completa
- **Naves e Veículos** — abas Naves/Veículos, busca por nome, detalhe técnico
- **Espécies** — busca por nome, detalhe com planeta natal resolvido

## Estrutura

```
index.html
css/style.css              # tokens de design e estilos
js/
  main.js                  # roteamento entre views e inicialização
  core/
    api.js                 # fetchJSON/BASE_URL + utilitários usados por mais de uma feature (getPlanetName)
    dom.js                 # estados genéricos de UI (carregando / erro)
  features/
    hub/view.js
    planets/{api,view}.js
    people/{api,view}.js
    films/{api,view}.js
    vehicles/{api,view}.js
    species/{api,view}.js
cypress-project/           # testes de interface (Cypress + BDD/Gherkin) — ver README próprio
api-testing/                # testes de API (Postman + Newman) — ver README próprio
docs-local/                 # notas internas do grupo (não versionadas — ver .gitignore)
```

## Como rodar os testes

Este projeto tem duas suítes de teste independentes, cada uma com seu
próprio `package.json` e README:

- **[cypress-project/](cypress-project/README.md)** — testes de interface (Cypress 13, BDD/Gherkin, Page Object Model)
- **[api-testing/](api-testing/README.md)** — testes de API (Postman/Newman) contra a SWAPI

Resumo rápido:

```bash
# Testes de interface
cd cypress-project && npm install && npm test

# Testes de API
cd api-testing && npm install && npm test
```

## Decisões de dados (importante para o Plano de Testes)

A SWAPI (`https://swapi.info/api`) cobre apenas os Episódios I–VI e tem limitações que afetam a aplicação:

1. **Não existe campo `species` no planeta.** A lista de "espécies presentes" em cada planeta é **derivada em tempo real** (`js/features/planets/api.js`): buscamos cada morador (`residents`) do planeta e agregamos as espécies encontradas.
2. **Não existe recurso de "eventos".** Usamos a lista de `films` de cada planeta como proxy de "principais acontecimentos".
3. **Não há busca/filtro server-side.** Todas as buscas do site (Personagens, Filmes, Naves e Veículos, Espécies) filtram a lista completa no cliente — a API ignora parâmetros de busca (`?search=`).

Esses pontos constam explicitamente no Plano de Testes (seção de Riscos e Limitações), já que são inferências e limitações conhecidas, não falhas da aplicação.

## Uso de IA

Este projeto teve apoio de IA (Claude, Anthropic) na geração do código-base do front-end, na reorganização do código por funcionalidade, na correção de um problema de performance no Sistema Planetário, e na criação das suítes de teste de interface (Cypress/BDD) e de API (Postman/Newman). Conforme item 11 do enunciado, isso deve ser declarado na apresentação e o grupo deve dominar o funcionamento de cada arquivo.
