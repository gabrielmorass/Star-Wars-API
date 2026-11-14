# Decisões do Bloco B: BFF e imagem da aplicação

**Dono:** Eduardo (Bloco B). Os arquivos cobertos aqui são `api/src/` (estrutura base), `api/Dockerfile`, `api/.dockerignore`, `scripts/ci/empacotar.sh`, `scripts/ci/imagem.sh` e a ligação do front com o BFF.

Cada item registra **a decisão**, **a alternativa considerada** e **o preço** da escolha. Nenhuma decisão é de graça. Saber o que se perdeu é parte de saber por que se escolheu.

Medições feitas em 14/11/2026, na `main` com as dependências atuais (`express` e `redis`).

---

## Estrutura do BFF

### 1. `app.js` e `server.js` separados

**Decisão:** `app.js` monta o Express e o **exporta sem `listen()`**. `server.js` só abre a porta (lida de `PORT`), liga o cache e trata o SIGTERM.

**Alternativa considerada:** um único `index.js` com `app.listen()` no final, que é o formato mais comum em tutoriais.

**O preço:** um arquivo a mais e uma regra que todos precisam respeitar: nada de efeito colateral no `app.js`, nem conexão nem porta. Em troca, o supertest (Bloco C) importa o app e testa em memória, sem abrir porta e sem conflito entre testes. É por isso que a suíte inteira roda em segundos, sem Redis e sem rede.

### 2. Pass-through fiel: as URLs da swapi.info não são reescritas

**Decisão:** as rotas devolvem o JSON da SWAPI **sem alteração**: o mesmo array, sem envelope, e os campos `url`, `homeworld`, `films`, `species` etc. continuam apontando para `https://swapi.info/api/...`.

**Alternativa considerada:** reescrever as URLs para `/api/...` dentro do BFF, o que deixaria os dados "autocontidos".

**O preço:** os dados carregam URLs de um host que o front não deve chamar, e o front precisa traduzi-las na hora da requisição (decisão 16). Em troca, as views, que indexam tudo por `url` e cruzam recursos por ela, não precisaram mudar de lógica. Os cenários Cypress da NP1 continuaram passando sem nenhuma alteração. Reescrever exigiria mudar o BFF e as views ao mesmo tempo, perto do code freeze.

### 3. `services/swapi.js` com uma única função, `buscar(caminho)`

**Decisão:** o único ponto do BFF que fala com a internet é `buscar(caminho)`. Ele tem timeout (`SWAPI_TIMEOUT_MS`, padrão 8 s) e converte cada falha num erro com `.status`: 404 quando o recurso não existe, 502 quando a SWAPI está fora, demora demais ou responde algo que não é JSON.

**Alternativa considerada:** uma função por recurso (`buscarPessoas`, `buscarFilmes`...), ou chamar `fetch` direto nas rotas.

**O preço:** a função não sabe nada do recurso que busca, então validação e formatação ficam nas rotas. Em troca, o cache do Bloco D foi plugado **envolvendo essa função** (`ativarCache(swapi)` no `server.js`), sem tocar em nenhuma rota. Os testes também simulam a SWAPI num ponto só.

### 4. Fábrica `routes/_recurso.js`

**Decisão:** `criarRotaRecurso('people')` gera a lista (`GET /`) e o detalhe (`GET /:id`), com validação do id. Um recurso novo é um arquivo de uma linha.

**Alternativa considerada:** escrever as duas rotas à mão em cada arquivo.

**O preço:** uma indireção a mais para quem lê `people.js` pela primeira vez, e todos os recursos presos ao mesmo formato. A fábrica ganhou depois um parâmetro opcional `apresentar` (Bloco C, para a tradução de Espécies), que é a válvula para quem precisa fugir do padrão. Em troca, vehicles, starships, species e planets entraram em minutos, com o mesmo contrato de erro. O `routes.test.js` testa todos com uma única bateria parametrizada.

### 5. Contrato de erro sempre em JSON: 400, 404 e 502

**Decisão:** id que não é inteiro positivo → `400`, **sem chamar a SWAPI**. Recurso inexistente → `404`. SWAPI fora ou lenta → `502`. Erro inesperado nosso → `500` com mensagem genérica. O corpo é sempre `{ "erro": "..." }`. A swapi.info responde 404 com uma página **HTML**, e o BFF converte isso para JSON.

**Alternativa considerada:** repassar o status e o corpo da SWAPI como vierem.

**O preço:** o BFF passa a decidir semântica: um 404 nosso pode ser "rota inexistente" ou "recurso inexistente", e só a mensagem diferencia. Em troca, o front e os testes nunca recebem HTML, e o 502 diz claramente "o problema não é seu, é da origem".

---

## Imagem (`api/Dockerfile`)

### 6. Multi-stage com `npm prune --omit=dev`

**Decisão:** o estágio `build` roda `npm ci` (tudo, inclusive devDependencies) e depois `npm prune --omit=dev`. O estágio `final` parte de uma base limpa e copia **só** o `node_modules` resultante.

**Alternativa considerada:** um estágio só, com `npm ci --omit=dev`.

**O preço:** a build fica mais longa e o Dockerfile mais difícil de ler. Com um estágio só, `npm ci --omit=dev` daria o mesmo `node_modules`. O ganho real do multi-stage é ter **onde** rodar passos que precisam das devDependencies (lint, testes, transpilação) sem que elas cheguem à imagem. Hoje os testes rodam no estágio próprio do pipeline, então esse espaço está vazio.

**Medido:** o `node_modules` completo tem **76 MB** (jest, supertest, nock, jest-junit). Depois do prune, **19,6 MB**. Na imagem final não há nenhuma devDependency.

### 7. Base `node:20.20.2-alpine`, com versão exata

**Decisão:** a versão exata, igual à do `jenkins/Dockerfile` (Bloco A), declarada uma vez com `ARG` antes do primeiro `FROM` e usada nos dois estágios.

**Alternativa considerada:** a tag móvel `node:20-alpine`, ou a base Debian `node:20`.

**O preço:** atualizações de segurança do Node não entram sozinhas. Alguém precisa subir a versão nos dois Dockerfiles, de propósito. Em troca, a build de hoje e a do dia da defesa usam o mesmo Node, que também é o Node em que os testes rodam no Jenkins (critério 2: imagem reproduzível). Alpine em vez de Debian porque a base Debian passa de 1 GB. O preço da Alpine é a `musl` no lugar da `glibc`, que pode quebrar pacotes com binário nativo. Não usamos nenhum.

### 8. `COPY package*.json` antes do `COPY src`

**Decisão:** os manifestos entram antes do código, nos dois estágios.

**Alternativa considerada:** um único `COPY . .`.

**O preço:** duas instruções em vez de uma. Em troca, o Docker reaproveita a camada do `npm ci` enquanto as dependências não mudam. Alterar só o `src/`, que é o caso mais comum, não reinstala nada. A imagem final sai idêntica nas duas formas; muda o tempo de cada build do pipeline.

### 9. Código com dono root, processo como usuário `node`

**Decisão:** os `COPY` são feitos sem `--chown`, então os arquivos ficam com dono root e permissão 644. Depois, `USER node` (uid 1000, já presente na imagem oficial).

**Alternativa considerada:** `COPY --chown=node:node`, que é o mais comum, ou não ter `USER` nenhum e rodar como root.

**O preço:** o processo não consegue escrever em `/app`. Se um dia o app precisar gravar arquivo, vai precisar de um diretório próprio com permissão. Também não pode abrir porta abaixo de 1024 (a 3000 está acima). Em troca, quem explorar uma falha no app não tem root e **não consegue reescrever o próprio servidor**: testado, o `touch /app/src/x` dá *Permission denied*. O `imagem.sh` reprova a build se a imagem rodar como root.

### 10. HEALTHCHECK com `wget`, não `curl`

**Decisão:** `wget -qO- http://localhost:${PORT}/api/health`, com `start-period` de 10 s e 3 tentativas.

**Alternativa considerada:** `curl -f`, que é o mais citado.

**O preço:** o wget do BusyBox tem menos opções que o curl. Em troca, ele já vem na Alpine, e instalar curl só para isso aumentaria a imagem. O `/api/health` **não chama a SWAPI**: se a SWAPI cair, o container continua saudável. Observação: o `docker-compose.yml` declara o próprio healthcheck para a api, que tem precedência; o do Dockerfile vale para quem roda a imagem com `docker run`. A linha `ENV PORT=3000` existe por causa deste healthcheck. Sem ela, a URL vira `localhost:/api/health` e o container fica *unhealthy* para sempre.

### 11. `CMD` em forma exec

**Decisão:** `CMD ["node", "src/server.js"]`.

**Alternativa considerada:** `CMD npm start` ou a forma shell `CMD node src/server.js`.

**O preço:** nenhum script do `package.json` é usado para iniciar; quem mudar o comando de start precisa mudar nos dois lugares. Em troca, o `node` é o **PID 1** e recebe o SIGTERM do `docker stop` direto. O `server.js` fecha o servidor e sai em ~1 s. Com `npm` ou `sh` no meio, o sinal não chega ao Node, e o Docker espera 10 s e mata com SIGKILL, cortando requisições em andamento.

---

## Scripts de CI

### 12. `git archive` no `empacotar.sh`

**Decisão:** o pacote `dist/codex-estelar-<BUILD>-<sha>.tgz` é gerado com `git archive` a partir do commit, contendo `api/` e o front estático. Antes, os `.tgz` antigos de `dist/` são apagados.

**Alternativa considerada:** `tar` do diretório de trabalho com uma lista de exclusões.

**O preço:** alterações não commitadas não entram no pacote; quem testa local recebe um aviso. Em troca, o pacote é **exatamente o commit**: `node_modules`, `coverage` e `.env` não entram por construção, porque estão no `.gitignore`. O script ainda confere o conteúdo e falha se achar algum deles. Limpar `dist/` evita o problema do build #7, que arquivou um pacote velho.

### 13. Tag dupla, `BUILD_NUMBER` + SHA curto, e nunca `latest`

**Decisão:** um único `docker build` com duas tags: `IMAGE_REPO:<BUILD_NUMBER>` e `IMAGE_REPO:<sha curto>`. O script recusa `latest`.

**Alternativa considerada:** `latest`, ou só uma das duas tags.

**O preço:** quem quer "a mais nova" precisa saber o número do build. Não existe um nome fixo para puxar. Em troca, toda imagem aponta para **uma execução do Jenkins** e para **um commit**, e o rollback é rodar a tag anterior. `latest` é uma tag móvel: não diz qual código está dentro, e duas máquinas com `latest` podem rodar versões diferentes. O commit completo também fica gravado no label OCI `org.opencontainers.image.revision`.

### 14. Build reprodutível: `SOURCE_DATE_EPOCH` + `--provenance=false`

**Decisão:** `SOURCE_DATE_EPOCH` = data do commit (exportada, porque o buildx lê do ambiente), mais `--provenance=false`. Não há label com data nem com número de build.

**Alternativa considerada:** o padrão do BuildKit, sem nenhum dos dois.

**O preço:** a imagem perde a atestação de proveniência (metadados de supply chain que o buildx anexa) e o campo `created` mostra a data do commit, não a do build. O `--provenance` é opção do buildx, então exige buildx no Jenkins, que o `jenkins/Dockerfile` instala.

**Como foi descoberto:** nos testes do `imagem.sh`, o mesmo commit construído como build 42 e build 43 gerava **IDs diferentes**. O BuildKit grava a hora do build no `created` e a atestação também tem horário. Só com as duas correções juntas o ID ficou igual; cada uma sozinha não bastou.

---

## Front consumindo o BFF (PR #59)

### 15. `API_BASE = "/api"`, relativo e sem fallback

**Decisão:** a constante fica em `js/config.js` com caminho **relativo** à origem. No compose, o nginx do `web/` serve o front e encaminha `/api` para a api. **Não há fallback para a swapi.info.**

**Alternativa considerada:** uma URL absoluta (`http://localhost:3000/api`), que exigiria CORS no BFF, e/ou cair para a swapi.info quando o BFF falhar.

**O preço:** fora do compose, o front precisa de um servidor com proxy. O `npm run servidor` do Cypress passou a usar `http-server -P http://localhost:3000`, e o BFF precisa estar de pé para a suíte rodar. Em troca, front e BFF ficam na mesma origem, sem CORS e sem host no código. Se o BFF cair, a tela **mostra o erro**. Um fallback silencioso esconderia do smoke test e da aba Network justamente a falha que eles precisam mostrar.

### 16. `viaBff(url)`: traduz a URL do dado só na hora da requisição

**Decisão:** em `js/features/people/api.js`, `viaBff("https://swapi.info/api/films/1")` devolve `"/api/films/1"`. A URL original continua sendo a **chave** dos mapas; só o endereço da requisição muda.

**Alternativa considerada:** alterar o `getPlanetName` do `js/core/api.js`, ou reescrever as URLs no BFF (ver decisão 2).

**O preço:** quem adicionar um `fetch` novo numa URL vinda dos dados precisa lembrar do `viaBff`. Senão, aquela chamada volta a ir direto para a swapi.info. Em troca, o core (Bloco A) e a view de Espécies não mudaram, e as views de Personagens e Filmes fazem **zero** chamadas à swapi.info (93 requisições verificadas no navegador).

---

## Tamanho da imagem: três números, três significados

O critério pede a imagem final abaixo de 200 MB. Dependendo de **como** se mede, o número muda, e é preciso saber explicar a diferença:

| Medida | Como obter | Valor (14/11) |
|---|---|---|
| `docker images`, com o **containerd image store** | `docker images` no Docker Desktop recente | **216 MB** |
| Tamanho real do filesystem da imagem | soma da coluna SIZE de `docker history` | **165,8 MB** |
| Comprimido, o que trafega e fica no Docker Hub | `docker save <img> \| wc -c`, ou a página da tag no Hub | **50,7 MB** |

**Por que o `docker images` mostra mais:** com o containerd image store, o Docker conta **as duas cópias** que guarda: as camadas comprimidas, como vieram do registry, e as camadas descompactadas que o container usa. Nessa mesma conta, a base `node:20.20.2-alpine` **pura, sem nada nosso**, aparece com **194 MB**. Com o store clássico (overlay2), o `docker images` mostra o tamanho real, ~166 MB. Para saber qual store a máquina usa:

```bash
docker info --format '{{.DriverStatus}}'
# [[driver-type io.containerd.snapshotter.v1]] → containerd (conta em dobro)
```

**De onde vem o tamanho real:** a base tem ~145 MB, sendo ~98 MB só do binário do Node e ~16 MB do npm, que vem na imagem oficial. O nosso `node_modules` tem 19,6 MB, dos quais ~15 MB são o cliente Redis (Bloco D) e ~4 MB o Express e o que ele traz.

**O preço da base `node:20.20.2-alpine`:** ela traz npm e yarn, que não usamos em runtime. Removê-los num `RUN rm` não reduz nada, porque a camada da base continua lá. A alternativa que reduziria de verdade é partir de `alpine` puro e copiar só o binário do Node do estágio build (estimativa: ~130 MB reais). Não foi feita porque troca a imagem oficial, mantida e testada, por uma montagem nossa, e muda a base que o grupo alinhou com o Jenkins.
