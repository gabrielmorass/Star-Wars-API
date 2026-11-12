# API (BFF) — Codex Estelar

Backend-for-frontend do Codex Estelar. Faz proxy da [SWAPI](https://swapi.info) para o front, que passa a falar só com `/api`.

**Dono:** Eduardo (Bloco B). Rotas de outros recursos e o cache Redis são plugados pelos colegas. Veja [Como adicionar uma rota](#como-adicionar-uma-rota).

## Rodar local

```bash
cd api
npm ci
npm start          # http://localhost:3000
```

| Variável | Padrão | Uso |
|---|---|---|
| `PORT` | `3000` | porta HTTP |
| `SWAPI_BASE_URL` | `https://swapi.info/api` | origem dos dados |
| `SWAPI_TIMEOUT_MS` | `8000` | tempo máximo de espera pela SWAPI antes de responder 502 |

## Estrutura

```
api/src/
├── app.js              # monta o Express e EXPORTA (sem listen) → usado pelo supertest
├── server.js           # bootstrap: app.listen(PORT) + encerramento limpo no SIGTERM
├── routes/
│   ├── _recurso.js     # fábrica de rotas pass-through (lista + /:id)
│   ├── health.js
│   ├── people.js
│   └── films.js
└── services/
    └── swapi.js        # buscar(caminho): único ponto que fala com a SWAPI
```

## Contrato das rotas

Todas as respostas, inclusive as de erro, são `application/json`.

### Pass-through fiel

As rotas de recurso devolvem o JSON da SWAPI **sem nenhuma alteração**:
- as listas são o **array completo**, sem paginação e sem envelope (`{results: ...}`);
- os campos `url`, `homeworld`, `films`, `species` etc. **continuam apontando para `https://swapi.info/api/...`**.

Isso é proposital. As views do front indexam os dados por `url` e cruzam recursos diferentes por ela. Reescrever as URLs quebraria esses cruzamentos e os cenários Cypress.

| Método | Path | 200 | Exemplo |
|---|---|---|---|
| GET | `/api/health` | `{ "status": "ok", "versao": "1.0.0" }` | — |
| GET | `/api/people` | array com todos os personagens (82) | `[{ "name": "Luke Skywalker", ..., "url": "https://swapi.info/api/people/1" }, ...]` |
| GET | `/api/people/:id` | objeto do personagem | `{ "name": "Luke Skywalker", "height": "172", "films": ["https://swapi.info/api/films/1", ...], ... }` |
| GET | `/api/films` | array com todos os filmes (6) | `[{ "title": "A New Hope", "episode_id": 4, ... }, ...]` |
| GET | `/api/films/:id` | objeto do filme | `{ "title": "A New Hope", "episode_id": 4, "opening_crawl": "...", ... }` |

`:id` é o mesmo número da SWAPI. Atenção: `/api/films/1` é *A New Hope* (episódio IV), não o episódio I.

### Contrato de erro

Corpo sempre no formato `{ "erro": "<mensagem legível>" }`.

| Status | Quando | Exemplo de corpo |
|---|---|---|
| `400` | `:id` não é inteiro positivo (`abc`, `0`, `-1`, `1.5`, `01`). A SWAPI nem é chamada. | `{ "erro": "id inválido: \"abc\" (esperado inteiro positivo)" }` |
| `404` | recurso não existe na SWAPI (ex.: `/api/people/999`) | `{ "erro": "Recurso não encontrado" }` |
| `404` | rota inexistente (ex.: `/api/nada`) | `{ "erro": "rota não encontrada: GET /api/nada" }` |
| `502` | SWAPI fora do ar, sem resposta dentro de `SWAPI_TIMEOUT_MS`, com status 5xx ou com resposta que não é JSON | `{ "erro": "SWAPI não respondeu a tempo" }` |
| `500` | erro inesperado no nosso código (a mensagem interna não é exposta) | `{ "erro": "erro interno" }` |

A swapi.info responde 404 com uma página **HTML**. O BFF converte isso para o 404 JSON acima.

## Como adicionar uma rota

**Recurso da SWAPI** (species, vehicles, starships, planets): use um arquivo de uma linha.

```js
// src/routes/species.js
const { criarRotaRecurso } = require('./_recurso');
module.exports = criarRotaRecurso('species');
```

```js
// src/app.js, na seção "rotas"
app.use('/api/species', require('./routes/species'));
```

**Cache (Bloco D):** envolva `buscar(caminho)` de `services/swapi.js`. As rotas chamam só essa função, então nenhuma delas precisa mudar. A função rejeita com um erro que tem `.status` (404 ou 502). Guarde no cache só o que resolver com sucesso.

**Health (Bloco A):** `routes/health.js` é a versão mínima. Mantenha o status 200 e `{ status: "ok" }` quando estiver saudável, e não chame a SWAPI dali.

## Testando com supertest (Bloco C)

```js
const request = require('supertest');
const app = require('../src/app');   // não abre porta

test('GET /api/people/abc → 400', () =>
  request(app).get('/api/people/abc').expect(400));
```
