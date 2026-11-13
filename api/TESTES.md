# Testes e cobertura do BFF

A suíte do Bloco C valida o código Node do Codex Estelar sem consultar a
SWAPI real e sem exigir um servidor Redis. Ela complementa a coleção
Newman da NP1, que verifica o contrato da API externa e não mede cobertura
do nosso código.

## Executar

Requer Node 20 ou superior. De dentro de `api/`:

```bash
npm ci
npm test
```

Da raiz, no Git Bash ou Linux, execute a mesma etapa usada pelo Jenkins:

```bash
bash scripts/ci/testes.sh
```

A instalação requer acesso ao registro npm. Depois de instalar, os testes
rodam sem acesso à internet. O Nock bloqueia conexões HTTP externas não
simuladas; apenas o loopback IPv4 é liberado para o servidor temporário do
Supertest. O cliente Redis é substituído por dublês, inclusive na ativação
do cache. Um mock HTTP que não for consumido reprova o teste.

## Limite de cobertura

`jest.config.js` exige pelo menos **90% em cada métrica global**:
instruções, ramificações, funções e linhas. O comando `npm test` sempre
coleta cobertura; falhas de teste ou de cobertura retornam código diferente
de zero. O script `testes.sh` propaga esse código para reprovar o estágio.

O escopo é **todo `src/**/*.js`**, inclusive arquivos que nenhum teste
importe. Rotas e módulos novos passam a contar automaticamente.

Para demonstrar o bloqueio, da raiz execute no Git Bash/Linux:

```bash
bash scripts/ci/testes.sh --testNamePattern 'health responde'
```

Esse comando executa somente o caso de saúde. O caso passa, mas a
cobertura global fica abaixo de 90% e o script retorna **1**.
Depois execute `bash scripts/ci/testes.sh` sem filtros para restaurar os
relatórios completos. Esta verificação local comprova a propagação do
erro; a evidência de build vermelha precisa ser obtida no Jenkins.

A única exclusão do código da aplicação é `src/server.js`: ele abre a
porta, ativa o cache e registra sinais de encerramento do processo.
O app Express, seus middlewares, as rotas, o cliente SWAPI e toda a camada
de cache permanecem na medição. A função `ativarCache` é testada
isoladamente; a inicialização real do processo/container fica para o
smoke test do ambiente.

## Relatórios e Jenkins

| Saída a partir da raiz | Uso |
| --- | --- |
| `api/relatorios/junit.xml` | Resultados dos casos na aba de testes do Jenkins |
| `api/coverage/lcov-report/index.html` | Relatório de cobertura publicado pelo Jenkins |
| `api/coverage/lcov.info` | Cobertura em formato LCOV |
| `api/coverage/coverage-summary.json` | Resumo das quatro métricas |
| `api/coverage/index.html` | Relatório HTML adicional para consulta local |

Esses caminhos seguem o contrato já presente no `Jenkinsfile`.
O estágio de dependências instala o Jest e os reporters como dependências
de desenvolvimento. O estágio de testes chama `scripts/ci/testes.sh`.
O bloco `post.always` do Jenkins publica os relatórios mesmo quando um
estágio falha. Os arquivos gerados são ignorados pelo Git.

## Rastreabilidade

Os números abaixo continuam a sequência da NP1. Quando um caso usa uma
tabela de entradas ou recursos, cada combinação aparece separadamente no
JUnit.

| Caso | Comportamento | Arquivo |
| --- | --- | --- |
| TC-091 | Saúde independente da SWAPI, 404 JSON e erro interno sem expor detalhes | `tests/routes.test.js` |
| TC-092 | Listas dos quatro recursos atuais preservam arrays e referências | `tests/routes.test.js` |
| TC-093 | Detalhes preservam o objeto original | `tests/routes.test.js` |
| TC-094 | IDs inválidos são rejeitados sem chamar a origem | `tests/routes.test.js` |
| TC-095 | Recurso inexistente na origem devolve 404 JSON | `tests/routes.test.js` |
| TC-096 | HTTP 500 na origem devolve 502 no BFF | `tests/routes.test.js` |
| TC-097 | Payload que não é JSON, timeout e falha de rede devolvem 502 | `tests/routes.test.js` |
| TC-098 | Origem e timeout padrão, origem configurável e erro de domínio | `tests/swapi.test.js` |
| TC-099 | Hit, miss, JSON inválido, TTL, setEx/setex e falhas de leitura/escrita | `tests/cache.test.js` |
| TC-100 | Cache-aside, expiração simulada, origem com erro e Redis fora | `tests/cache.test.js` |
| TC-101 | Redis lento não prende a requisição e timers são liberados | `tests/cache.test.js` |
| TC-102 | Ativação, cliente injetado, reconexão e conexão recusada | `tests/cache.test.js` |
| TC-103 | Lista de Espécies preserva dados e referências, inclusive lista vazia | `tests/species.test.js` |
| TC-104 | Detalhe de Espécies preserva o objeto e suas URLs | `tests/species.test.js` |
| TC-105 | IDs inválidos em Espécies não consultam a SWAPI | `tests/species.test.js` |
| TC-106 | Espécie inexistente devolve 404 JSON | `tests/species.test.js` |
| TC-107 | Falha externa na lista e no detalhe de Espécies devolve 502 | `tests/species.test.js` |

A expiração do TC-100 é simulada por um dublê do Redis: verifica que a
aplicação volta à origem após um miss, sem pretender validar o próprio
servidor Redis. Um JSON sintaticamente inválido é rejeitado; o backend
atual não impõe um schema aos objetos retornados pela SWAPI.

## Escopo atual e validação integrada

Esta etapa cobre o backend disponível: health, people, films, vehicles,
starships, species, SWAPI e cache. As rotas de Espécies já têm testes
próprios de lista, detalhe, preservação de dados e erros. Tradução no
servidor e integração da tela serão entregues separadamente, com novos
casos de teste.

A execução local não comprova publicação dos relatórios em um Jenkins
real nem funcionamento do Compose. Essas evidências precisam ser
conferidas no ambiente integrado quando as entregas do grupo estiverem
disponíveis.

## Referências das ferramentas

- [Configuração de cobertura e limites no Jest](https://jestjs.io/docs/configuration)
- [Bloqueio de conexões reais no Nock](https://github.com/nock/nock#enabledisable-real-http-requests)
- [Configuração do reporter jest-junit](https://github.com/jest-community/jest-junit#configuration)
