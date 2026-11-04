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

FROM jenkins/jenkins:lts-jdk17

# ---------------------------------------------------------------------------
# Etapa com privilégio: instalação de pacotes
# ---------------------------------------------------------------------------
USER root

# Node 20: é a versão que o BFF (api/) usa. Manter alinhado com api/Dockerfile.
ARG NODE_MAJOR=20
# Só o CLI do Docker — o daemon é o do host, acessado pelo socket montado.
ARG DOCKER_CLI_VERSION=27.3.1
# buildx: o construtor moderno (BuildKit). Sem ele o Docker cai no builder
# legado, que além de estar marcado como obsoleto não faz cache das camadas
# intermediárias de um Dockerfile multi-stage — justamente o formato do
# api/Dockerfile. Com dezenas de execuções do pipeline até a entrega, a
# diferença de tempo é relevante.
ARG BUILDX_VERSION=0.17.1
# GID do grupo dono de /var/run/docker.sock NO HOST. Ver jenkins/README.md,
# seção "O Jenkins não consegue rodar docker".
ARG DOCKER_GID=999

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl gnupg; \
    \
    # --- Node + npm ---
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -; \
    apt-get install -y --no-install-recommends nodejs; \
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
    docker buildx version

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
