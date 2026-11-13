# INFRA — ambiente containerizado do Codex Estelar

Este documento descreve como o Codex Estelar roda em containers: quais são, como se falam, em que portas, com quais variáveis, e os comandos do dia a dia. A ideia é que alguém sem nenhum contexto consiga subir tudo seguindo só este arquivo.

O arquivo que define tudo é o `docker-compose.yml` da raiz.

## Topologia

Quatro containers numa rede só, a `codex-net`.

```
navegador ──8080──▶ web (nginx) ──HTTP──▶ api (BFF Node) ──TCP 6379──▶ redis
                                             │
                                             └──HTTPS──▶ swapi.info (internet)

navegador ──8081──▶ jenkins ──socket do Docker──▶ daemon do host
```

| Container | Papel | Origem da imagem |
|---|---|---|
| web | serve o front-end estático e encaminha `/api` para a api (nginx) | Dockerfile local, em `web/` |
| api | BFF: faz proxy da SWAPI para o front, com cache | imagem publicada pelo pipeline no Docker Hub (`image:` no compose) |
| redis | cache das respostas da SWAPI | imagem oficial `redis:7-alpine` do Docker Hub |
| jenkins | integração contínua (pipeline como código) | Dockerfile local, em `jenkins/` |

Por que quatro e não dois: cada um atende uma responsabilidade distinta. O web separa a entrega do front da lógica de dados, a api concentra o acesso à SWAPI num ponto só, o redis evita repetir chamadas externas, e o jenkins roda o pipeline que constrói, testa e publica a imagem da api.

### Quem fala com quem

- navegador → web: HTTP na porta publicada do web.
- web → api: HTTP pela rede `codex-net`, usando o nome do serviço (`api`) como endereço, via `proxy_pass` do nginx (`web/nginx.conf`). <!-- confirmar com o Lima quando o web/ entrar na main -->
- api → redis: TCP na porta 6379, endereço `redis://redis:6379`.
- api → SWAPI: HTTPS pela internet, só quando a resposta não está no cache.
- jenkins → Docker: pelo socket `/var/run/docker.sock` montado do host. É assim que ele constrói e publica imagens.

Dentro da rede, os containers se encontram pelo nome do serviço. Por isso o endereço do Redis é `redis` e não `localhost`.

## Portas

| Serviço | Porta no container | Porta no host | Variável | Uso |
|---|---|---|---|---|
| web | 80 | 8080 | `WEB_PORT` | site |
| api | 3000 | 3000 | `API_PORT` | BFF (`/api/health`, `/api/people`, ...) |
| redis | 6379 | não publicada | — | só acessível de dentro da rede |
| jenkins | 8080 | 8081 | — | interface do Jenkins |
| jenkins | 50000 | 50000 | — | porta de agentes (não usamos agente remoto) |

`WEB_PORT` e `API_PORT` só mudam a porta do host, e valem se alguma delas estiver ocupada na sua máquina.

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha. O `.env` nunca vai para o Git.

| Variável | Padrão | Quem usa | Descrição |
|---|---|---|---|
| `DOCKERHUB_USER` | `codexestelar` | compose, pipeline | dono da imagem da api no Docker Hub (sem hífen) |
| `DOCKERHUB_TOKEN` | vazio | jenkins | token do Docker Hub, nunca a senha da conta |
| `API_TAG` | `latest` | compose | tag da imagem da api que o compose sobe |
| `WEB_PORT` | `8080` | compose | porta do web no host |
| `API_PORT` | `3000` | compose | porta da api no host |
| `JENKINS_ADMIN_ID` | `admin` | jenkins | usuário administrador |
| `JENKINS_ADMIN_PASSWORD` | `admin` no compose | jenkins | senha do administrador (troque no `.env`) |
| `JENKINS_URL` | `http://localhost:8081/` | jenkins | endereço público do Jenkins |
| `REPO_URL` | repositório do projeto | jenkins | repositório que o job clona |
| `REPO_BRANCH` | `main` | jenkins | branch do job |
| `DOCKER_GID` | `999` | jenkins (build) | GID do grupo dono do socket do Docker no host (ver `jenkins/README.md`) |
| `EMAIL_DESTINATARIO` | vazio | jenkins | quem recebe o aviso do pipeline |
| `EMAIL_REMETENTE` | vazio | jenkins | remetente do aviso |
| `SMTP_HOST` | `smtp.gmail.com` | jenkins | servidor SMTP |
| `SMTP_PORT` | `587` | jenkins | porta SMTP |
| `SMTP_USER` | vazio | jenkins | usuário SMTP |
| `SMTP_PASS` | vazio | jenkins | senha de app do SMTP |
| `PORT` | `3000` | api | porta HTTP dentro do container |
| `SWAPI_BASE_URL` | `https://swapi.info/api` | api | origem dos dados |
| `SWAPI_TIMEOUT_MS` | `8000` | api | tempo máximo de espera pela SWAPI antes de responder 502 |
| `REDIS_URL` | `redis://redis:6379` | api | endereço do Redis; sem ela o cache fica desligado |
| `CACHE_TTL_SEGUNDOS` | `3600` | api | validade de cada resposta no cache |

## Subir pela primeira vez

Requisitos: Git e Docker Desktop abertos, com o motor rodando.

```
git clone https://github.com/gabrielmorass/Star-Wars-API.git
cd Star-Wars-API
cp .env.example .env
docker compose up -d --build
docker compose ps
```

O `ps` deve mostrar os quatro serviços como `healthy`. O Jenkins é o mais lento, leva uns 90 segundos. Depois:

- site: http://localhost:8080
- api: http://localhost:3000/api/health
- Jenkins: http://localhost:8081

## Dois modos de imagem para a api

O compose principal usa `image:` para a api, ou seja, puxa do Docker Hub a imagem que o pipeline publicou. O arquivo `docker-compose.override.yml` é lido automaticamente e troca isso por um build local de `./api`, útil enquanto se mexe no código.

| Comando | A api vem de |
|---|---|
| `docker compose up -d --build` | build local (override aplicado) |
| `docker compose -f docker-compose.yml up -d` | Docker Hub (`DOCKERHUB_USER`/codex-estelar-api:`API_TAG`) |

Para subir uma tag específica publicada pelo pipeline, use o sha curto do commit: `API_TAG=<sha> docker compose -f docker-compose.yml up -d`.

## Comandos do dia a dia

```
docker compose up -d --build          # subir (reconstrói o que mudou)
docker compose ps                     # estado e saúde
docker compose logs -f api            # logs de um serviço (troque o nome)
docker compose logs --tail 50 jenkins # últimas linhas
docker compose restart api            # reiniciar um serviço
docker compose down                   # derrubar, mantendo os volumes
docker compose down -v                # derrubar E APAGAR os volumes
bash scripts/ci/smoke.sh              # smoke test local (Git Bash)
```

Atenção ao `down -v`: apaga o histórico de builds do Jenkins e o cache do Redis.

## Volumes e persistência

| Volume | Montado em | O que guarda |
|---|---|---|
| `codex_jenkins_home` | `/var/jenkins_home` | jobs, histórico de builds e artefatos do Jenkins |
| `redis_data` | `/data` | o cache do Redis (Redis com `--appendonly yes`) |

Derrubar e subir os containers não perde nada. Teste feito com o Redis: depois de `docker compose down` e `up`, a chave `codex:vehicles` gravada antes continuava no cache, com o `ttl` já descontado. Para demonstrar ao vivo:

```
curl http://localhost:3000/api/vehicles
docker compose exec redis redis-cli ttl codex:vehicles
docker compose down
docker compose up -d
docker compose exec redis redis-cli ttl codex:vehicles
```

O segundo `ttl` tem que ser menor que o primeiro, e não `-2` (que significaria chave inexistente). No Jenkins, o histórico de builds continua listado depois do `down` e `up`.

## Cache e degradação graciosa

A api guarda cada resposta da SWAPI no Redis por `CACHE_TTL_SEGUNDOS` (`api/src/services/cache.js`). Se o Redis cair, ficar lento ou devolver lixo, a api não falha: trata como se não houvesse cache e busca na SWAPI, só um pouco mais devagar. Erros da SWAPI nunca vão para o cache.

Verificado com `docker compose stop redis`: a rota continuou respondendo `200`, e o log da api registrou `Redis indisponível` e `The client is offline`, sem derrubar o processo.

## Smoke test

`scripts/ci/smoke.sh` sobe o ambiente num projeto próprio (`smoke-codex`, com portas próprias, sem o Jenkins), espera os healthchecks e confere, por dentro da rede: web alcança a api, o proxy do nginx chega na api, uma rota real responde `200` com o corpo esperado e o Redis responde `PONG`. Derruba tudo no final, passando ou falhando. No pipeline, o estágio "Smoke test" do `Jenkinsfile` chama esse script.

## Problemas comuns

- `docker` não é reconhecido: o Docker Desktop não está instalado ou aberto. Abra-o, espere "Engine running" e abra um terminal novo.
- Porta já em uso: mude `WEB_PORT` ou `API_PORT` no `.env`.
- A api fica em `Restarting`: `docker compose logs --tail 40 api` mostra o erro.
- O Jenkins não consegue rodar `docker`: ajuste `DOCKER_GID` (ver `jenkins/README.md`) e reconstrua com `docker compose up -d --build jenkins`.
- `bash scripts/ci/smoke.sh` falha com `\r: command not found`: o arquivo está com quebra de linha do Windows. Converta para LF.
- No Windows, rode os scripts `.sh` no Git Bash, não no WSL (o WSL não enxerga o Docker do Windows por padrão).