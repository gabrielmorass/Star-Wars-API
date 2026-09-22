# Testes de API — Codex Estelar (Postman + Newman)

Suíte de testes de API contra a **SWAPI** (`https://swapi.info/api`), a
mesma API consumida pelo front-end do Codex Estelar — mesma abordagem
usada em aula (repositório de referência da disciplina S207,
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
| **Listagens** | `GET /api` (catálogo de recursos), `GET /planets`, `GET /people`, `GET /films` (6 episódios), `GET /species`, `GET /starships` (contrato de cabeçalho, tempo de resposta e campos), `GET /vehicles` |
| **Recurso específico** | `GET /planets/1` (Tatooine), `GET /films/1` (Episódio IV), `GET /species/1` (referências das réguas), `GET /people/1` (humano vem com `species` vazio), `GET /starships/10` (Millennium Falcon), `GET /vehicles/4` (Sand Crawler) |
| **Integridade referencial** | `GET /planets/1` → segue `residents[0]` e confirma que o personagem aponta de volta para o planeta |
| **Dados Inválidos/Inoportunos** | IDs inexistentes: `GET /planets/9999`, `/vehicles/9999`, `/species/9999`, `/films/9999`, `/people/9999`, `/starships/9999` (404). IDs malformados e valores limite: `GET /planets/abc`, `/people/0`, `/people/-1`, `/people/1abc`. Caminho em caixa alta: `GET /PLANETS` (404). Parâmetros ignorados: `GET /people?search=Luke` e `GET /planets?page=2` (a SWAPI não tem busca nem paginação server-side). Escrita rejeitada: `POST /planets` (API somente leitura) |

São **29 requisições** ao todo (TC-011 a TC-020, TC-044, TC-045, TC-068 e TC-075 a TC-090).

## Importar no Postman (interface visual)

1. Abra o Postman → **Import**
2. Importe `collections/swapi.collection.json`
3. Importe também `environments/swapi.environment.json`
4. Selecione o ambiente **"SWAPI — Ambiente de Testes"**
5. Execute os requests individualmente ou clique em **Run collection**
