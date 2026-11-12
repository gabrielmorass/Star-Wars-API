# Jenkins containerizado — Codex Estelar · Projeto S07 NP2
#
# Por que este arquivo existe:
#   Enunciado 2  — "Jenkins no modo container — não pode ser instalado direto
#                   na máquina."
#   Enunciado 3.1 — "Qualquer software necessário para a execução do pipeline
#                    deve ser instalado via script ou Dockerfile."
#
# Por isso o Node (que roda os testes e os scripts de CI) e o cliente Docker
# (que constrói e publica a imagem da api) são instalados AQUI. Nada é
# instalado à mão dentro do container depois que ele sobe — se fosse, a
# imagem deixaria de ser reproduzível.

# Versão FIXA, não a tag móvel "lts-jdk17".
#
# O critério 2 pede "imagem correta e reproduzível". A tag lts-jdk17 aponta
# para a LTS mais recente e muda sozinha: construir hoje e construir no dia
# da defesa daria Jenkins diferentes, com risco de um deles quebrar o
# pipeline sem ninguém ter mexido em nada.
#
# 2.541.3 é a versão com que validamos tudo em 04/11/2026. jdk17 porque o
# Jenkins moderno exige Java 17 ou superior.
FROM jenkins/jenkins:2.541.3-jdk17

# ---------------------------------------------------------------------------
# Etapa com privilégio: instalação de pacotes
# ---------------------------------------------------------------------------
USER root

# Node: versão exata, não só a linha 20.x. Mesma razão da imagem base —
# "setup_20.x" instalaria qualquer 20.x, e a imagem deixaria de ser
# reproduzível. Manter alinhado com o api/Dockerfile do Bloco B.
ARG NODE_MAJOR=20
ARG NODE_VERSION=20.20.2
# Só o CLI do Docker — o daemon é o do host, acessado pelo socket montado.
ARG DOCKER_CLI_VERSION=27.3.1
# buildx: o construtor moderno (BuildKit). Sem ele o Docker cai no builder
# legado, que além de estar marcado como obsoleto não faz cache das camadas
# intermediárias de um Dockerfile multi-stage — justamente o formato do
# api/Dockerfile. Com dezenas de execuções do pipeline até a entrega, a
# diferença de tempo é relevante.
ARG BUILDX_VERSION=0.17.1
# compose: o estágio de smoke test (Bloco D) sobe o ambiente com
# "docker compose up". Sem este plugin, o comando não existe dentro do
# container e o estágio falha — foi o que aconteceu no build #10.
# Exigência 3.1 do enunciado: software necessário ao pipeline vem do Dockerfile.
ARG COMPOSE_VERSION=2.29.7
# GID do grupo dono de /var/run/docker.sock NO HOST. Ver jenkins/README.md,
# seção "O Jenkins não consegue rodar docker".
ARG DOCKER_GID=999

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl gnupg; \
    \
    # --- Node + npm (versão exata, travada) ---
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -; \
    apt-get install -y --no-install-recommends "nodejs=${NODE_VERSION}-1nodesource1"; \
    # impede que um apt-get upgrade futuro troque a versão por baixo
    apt-mark hold nodejs; \
    \
    # --- cliente Docker (binário estático, sem precisar de repositório apt) ---
    curl -fsSL "https://download.docker.com/linux/static/stable/x86_64/docker-${DOCKER_CLI_VERSION}.tgz" \
      | tar -xz -C /usr/local/bin --strip-components=1 docker/docker; \
    \
    # --- buildx, como plugin do CLI ---
    mkdir -p /usr/local/lib/docker/cli-plugins; \
    curl -fsSL -o /usr/local/lib/docker/cli-plugins/docker-buildx \
      "https://github.com/docker/buildx/releases/download/v${BUILDX_VERSION}/buildx-v${BUILDX_VERSION}.linux-amd64"; \
    chmod 0755 /usr/local/lib/docker/cli-plugins/docker-buildx; \
    \
    # --- compose, também como plugin do CLI ---
    curl -fsSL -o /usr/local/lib/docker/cli-plugins/docker-compose \
      "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-linux-x86_64"; \
    chmod 0755 /usr/local/lib/docker/cli-plugins/docker-compose; \
    \
    # --- o usuário jenkins precisa pertencer ao grupo dono do socket ---
    if getent group "${DOCKER_GID}" >/dev/null; then \
        grupo="$(getent group "${DOCKER_GID}" | cut -d: -f1)"; \
    else \
        groupadd -g "${DOCKER_GID}" docker; \
        grupo=docker; \
    fi; \
    usermod -aG "${grupo}" jenkins; \
    \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*; \
    \
    # --- prova, no build, de que tudo ficou disponível ---
    node --version; \
    npm --version; \
    docker --version; \
    docker buildx version; \
    docker compose version

# ---------------------------------------------------------------------------
# Plugins — instalados no build, nunca pela interface
# ---------------------------------------------------------------------------
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# ---------------------------------------------------------------------------
# Configuration as Code
# ---------------------------------------------------------------------------
# O casc.yaml fica FORA de /var/jenkins_home de propósito: aquele caminho é um
# volume, e tudo que copiássemos para lá seria encoberto na primeira subida.
COPY casc.yaml /usr/local/jenkins/casc.yaml
ENV CASC_JENKINS_CONFIG=/usr/local/jenkins/casc.yaml

# Desliga o assistente de primeira execução: a configuração vem do casc.yaml.
# Sem isso o Jenkins abre a tela de senha inicial e pede configuração manual —
# exatamente o que o enunciado proíbe.
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"

USER jenkins
