# API (BFF) — Codex Estelar

Backend-for-frontend do Codex Estelar. Faz proxy da [SWAPI](https://swapi.info) para o front, que passa a falar só com `/api`.

**Dono:** Eduardo (Bloco B). Rotas de outros recursos e o cache Redis são plugados pelos colegas. Veja [Como adicionar uma rota](#como-adicionar-uma-rota).

**Por que está assim:** cada decisão de estrutura, imagem e scripts de CI deste bloco, com a alternativa considerada e o preço da escolha, está em [DECISOES.md](DECISOES.md). Lá também está a explicação dos três tamanhos da imagem.

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
├── domain/
│   └── traduzir.js     # vocabulário pt-BR e apresentação de Espécies
├── routes/
│   ├── _recurso.js     # fábrica de rotas pass-through (lista + /:id)
│   ├── health.js
│   ├── people.js
│   ├── films.js
│   ├── vehicles.js
│   ├── starships.js
│   └── species.js        # Daniele: lista e detalhe de Espécies
└── services/
    ├── swapi.js        # buscar(caminho): único ponto que fala com a SWAPI
    └── cache.js        # cache Redis com degradação graciosa
```

## Contrato das rotas

Todas as respostas, inclusive as de erro, são `application/json`.

### Pass-through fiel

Por padrão, as rotas de recurso devolvem o JSON da SWAPI **sem nenhuma alteração**:
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
| GET | `/api/species` | array com todas as espécies, sem paginação ou envelope | `[{ "name": "Human", "classification": "mammal", ..., "url": "https://swapi.info/api/species/1" }, ...]` |
| GET | `/api/species/:id` | objeto da espécie | `{ "name": "Human", "homeworld": "https://swapi.info/api/planets/9", "people": [...], "films": [...], ... }` |

`:id` é o mesmo número da SWAPI. Atenção: `/api/films/1` é *A New Hope* (episódio IV), não o episódio I.

As rotas de Espécies pertencem ao Bloco C (Daniele) e usam a mesma fábrica
de rotas e camada SWAPI dos demais recursos. Preservam campos como
`classification`, `language`, `url`, `homeworld`, `people` e `films`, que a
interface utiliza em filtros, glifos e cruzamentos. Uma lista vazia é `[]`.
Os erros seguem o contrato abaixo. A tela já reconhece `ptBR` quando
recebido. A troca da origem das chamadas depende da configuração
compartilhada do frontend pelo Bloco E; até lá, continua usando a origem
atual e a tradução local quando não recebe `ptBR`.

### Tradução de Espécies no servidor

Use `GET /api/species?idioma=pt-BR` ou
`GET /api/species/:id?idioma=pt-BR` para acrescentar o objeto `ptBR` em cada
espécie. O array da lista e todos os campos originais são preservados.
Sem o parâmetro, ou com outro idioma, a resposta continua pass-through.
O parâmetro não é encaminhado à SWAPI.

Exemplo parcial de uma espécie na resposta traduzida:

```json
{
  "name": "Wookie",
  "classification": "mammal",
  "language": "Shyriiwook",
  "hair_colors": "brown",
  "ptBR": {
    "classification": "mamífero",
    "designation": "senciente",
    "language": "Shyriiwook",
    "skin_colors": [{ "valor": "gray", "nome": "cinza" }],
    "hair_colors": [{ "valor": "brown", "nome": "castanho" }],
    "eye_colors": [{ "valor": "blue", "nome": "azul" }]
  }
}
```

`ptBR` tem classificação, designação, língua normalizada e as três paletas
de cores. Cada amostra mantém `valor` para resolver a cor CSS e `nome` para
exibição. Os nomes próprios não são traduzidos; grafias conhecidas como
`Galatic Basic` são normalizadas. Valores desconhecidos são preservados,
e valores ausentes recebem texto legível.

O módulo `src/domain/traduzir.js` porta os dicionários e funções de
`js/core/vocabulario.js` para CommonJS, incluindo clima, terreno, gênero,
classes de naves e durações. Nesta etapa, apenas Espécies usa a tradução
nas respostas HTTP. Os dicionários permanecem em ambos os ambientes
enquanto as demais telas ainda traduzem no navegador.

A apresentação é aplicada depois da busca/cache, sem alterar o objeto
bruto armazenado no Redis. Ao solicitar tradução, listas ou itens com
estrutura incompatível devolvem `502` JSON; campos opcionais ausentes
continuam permitidos. A validação é estrutural, sem impor um schema
completo da SWAPI.

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

A fábrica também aceita `criarRotaRecurso(recurso, apresentar)`, com a
função síncrona `apresentar(dados, req)`. Sem essa função, mantém o
pass-through. A rota real de Espécies usa essa extensão para acrescentar
`ptBR` quando solicitado.

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

### Suíte automatizada e cobertura

Depois de `npm ci`, execute `npm test` em `api/`. A suíte usa Jest,
Supertest e Nock, com Redis simulado e limite global de 90% em linhas,
instruções, funções e ramificações. Da raiz, a etapa do Jenkins pode ser
executada com `bash scripts/ci/testes.sh`.

Consulte [TESTES.md](TESTES.md) para o escopo da cobertura, os casos
TC-091 em diante, os caminhos dos relatórios e a demonstração do bloqueio.
