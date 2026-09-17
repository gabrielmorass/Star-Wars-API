# Testes de API — Codex Estelar (Postman + Newman)

Suíte de testes de API contra a **SWAPI** (`https://swapi.info/api`), a
mesma API consumida pelo front-end do Codex Estelar — mesma abordagem
usada em aula (repositório de referência da disciplina S07,
`api-testing/`), aqui aplicada à SWAPI em vez da PokéAPI.

## Tecnologias

- **[Postman](https://www.postman.com/)** — criação e manutenção da collection
- **[Newman](https://github.com/postmanlabs/newman)** — executor CLI do Postman
- **[newman-reporter-htmlextra](https://github.com/DannyDainton/newman-reporter-htmlextra)** — relatório HTML

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior

## Instalação

```bash
cd api-testing
npm install
```

## Como executar

```bash
# Saída simples no terminal
npm test

# Com relatório HTML (gera relatorio.html na raiz desta pasta)
npm run test:relatorio
```

## Estrutura

```
api-testing/
├── collections/
│   └── swapi.collection.json      # requests + testes (pm.test)
├── environments/
│   └── swapi.environment.json     # variável {{baseUrl}}
└── package.json
```

## O que é testado

| Categoria | Requests |
|---|---|
| **Dados Válidos** | `GET /planets`, `GET /people`, `GET /films` (6 episódios), `GET /species`, `GET /starships`, `GET /starships/10` (nave específica), `GET /vehicles/4` (veículo específico) |
| **Dados Inválidos/Inoportunos** | `GET /planets/9999` (404), `GET /planets/abc` (ID malformado), `GET /vehicles/9999` (404), `GET /species/9999` (404), `GET /people?search=Luke` (a SWAPI não suporta busca server-side — parâmetro é ignorado) |

São **12 requisições** ao todo (TC-011 a TC-020, mais TC-044 e TC-045).

## Importar no Postman (interface visual)

1. Abra o Postman → **Import**
2. Importe `collections/swapi.collection.json`
3. Importe também `environments/swapi.environment.json`
4. Selecione o ambiente **"SWAPI — Ambiente de Testes"**
5. Execute os requests individualmente ou clique em **Run collection**
