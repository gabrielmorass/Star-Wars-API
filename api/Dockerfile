# Imagem do BFF (api) — Codex Estelar · Projeto S07 NP2
# Dono: Eduardo (Bloco B)
#
# Multi-stage: o estágio "build" tem todas as dependências (inclusive as de
# desenvolvimento); o estágio final recebe SÓ o que roda em produção. Nada
# de ferramenta de teste, cache do npm ou arquivo temporário chega à imagem
# publicada.
#
# Construir e rodar local (de dentro de api/):
#     docker build -t codex-api:dev .
#     docker run --rm -p 3000:3000 codex-api:dev

# Versão EXATA do Node, igual à do jenkins/Dockerfile (Bloco A). A tag
# móvel "20-alpine" muda sozinha a cada patch: a build de hoje e a do dia da
# defesa dariam imagens diferentes (critério 2: imagem reproduzível).
# Declarado antes do primeiro FROM para valer nos dois estágios.
ARG NODE_VERSION=20.20.2

# ===========================================================================
# Estágio 1 — build: dependências completas
# ===========================================================================
FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /app

# package*.json ANTES do código, de propósito: o Docker reaproveita a camada
# do "npm ci" enquanto as dependências não mudarem. Alterar só o src/ não
# reinstala nada — a build cai de dezenas de segundos para poucos.
COPY package*.json ./

# npm ci, e não npm install: instala exatamente o que está no
# package-lock.json e falha se o lock estiver desatualizado.
RUN npm ci --no-audit --no-fund

COPY src ./src

# Aqui é o lugar de qualquer passo que precise das devDependencies
# (lint, testes, transpilação). Hoje o BFF é JavaScript puro e os testes
# rodam no estágio próprio do pipeline (Bloco C), então não há nada.

# Remove as devDependencies: o node_modules que sobra é o de produção, e é
# só ele que o estágio final copia.
RUN npm prune --omit=dev

# ===========================================================================
# Estágio 2 — final: só produção
# ===========================================================================
# Alpine: base de poucos MB (contra ~1 GB da node:20 Debian completa), e é
# o que mantém a imagem abaixo de 200 MB.
FROM node:${NODE_VERSION}-alpine AS final

# Algumas bibliotecas (o próprio Express) ficam mais enxutas e rápidas com
# NODE_ENV=production; também deixa explícito em que modo a imagem roda.
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Os arquivos ficam com dono root e o processo roda como "node" (abaixo):
# o usuário da aplicação consegue LER o código, mas não alterá-lo. Se alguém
# explorar uma falha no app, não consegue reescrever o próprio servidor.
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

# Usuário não-root. A imagem oficial do Node já traz o usuário "node"
# (uid 1000); não é preciso criar. Rodar como root dentro do container
# daria privilégio de root a qualquer invasor que escapasse do processo.
USER node

# Documentação: a porta em que o app escuta. Quem publica de fato é o
# "ports:" do docker-compose.yml.
EXPOSE 3000

# O Docker marca o container como healthy/unhealthy chamando esta rota.
# - wget, e não curl: a alpine traz wget (BusyBox) e não traz curl; instalar
#   curl só para isso aumentaria a imagem. O docker-compose.yml usa o mesmo.
# - /api/health não chama a SWAPI: a SWAPI cair não deve derrubar o container.
# - start-period dá tempo ao Node de subir antes de contar falhas.
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT}/api/health" >/dev/null || exit 1

# Forma JSON (exec), e não "npm start": o node vira o PID 1 e recebe o
# SIGTERM do "docker stop" direto — o server.js trata e encerra limpo. Via
# npm, o sinal pararia no npm e o container levaria 10 s para morrer.
CMD ["node", "src/server.js"]
