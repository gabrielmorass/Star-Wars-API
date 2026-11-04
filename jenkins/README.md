# Jenkins containerizado — Codex Estelar · S07 NP2

Dono: **Gabriel (Bloco A)**

Este diretório contém o motor de CI do projeto. Tudo aqui é configuração como
código: o Jenkins nasce pronto, sem ninguém clicar em nada. Isso não é
preciosismo — o enunciado trata "usar a interface gráfica do Jenkins para criar
etapas do pipeline" como **critério eliminatório**.

| Arquivo | O que faz |
|---|---|
| `Dockerfile` | Jenkins LTS + Node 20 + cliente Docker + plugins |
| `plugins.txt` | lista declarativa de plugins, instalados no build |
| `casc.yaml` | usuário, credenciais, variáveis e **o job do pipeline** |

O `Jenkinsfile` fica na raiz do repositório, não aqui — é ele que o job aponta.

---

## Subir

```bash
cp .env.example .env        # na raiz; preencher ao menos JENKINS_ADMIN_PASSWORD
docker compose -f docker-compose.jenkins.yml up -d --build
```

A primeira subida leva alguns minutos (baixa a imagem base e os plugins).
Acompanhe:

```bash
docker compose -f docker-compose.jenkins.yml logs -f jenkins
```

Quando aparecer `Jenkins is fully up and running`, abra **http://localhost:8081**
e entre com `JENKINS_ADMIN_ID` / `JENKINS_ADMIN_PASSWORD` do `.env`.

O job **`codex-estelar-np2`** já deve estar lá. Se estiver, o JCasC funcionou.

> `docker-compose.jenkins.yml` é temporário. Quando o `docker-compose.yml` da
> Samile (Bloco D) existir, o serviço `jenkins` migra para lá e este arquivo é
> apagado.

## Derrubar

```bash
docker compose -f docker-compose.jenkins.yml down      # mantém o histórico
docker compose -f docker-compose.jenkins.yml down -v   # APAGA o volume
```

A diferença entre os dois é a demonstração do critério 9 (volumes): depois de
`down` sem `-v`, suba de novo e o histórico de builds continua lá.

---

## Como o pipeline evolui

O `Jenkinsfile` não precisa ser editado a cada entrega. Cada estágio procura o
script do dono em `scripts/ci/`:

- **o script existe** → o estágio executa;
- **não existe** → imprime um aviso dizendo de quem é e segue verde.

Então, para ativar um estágio, basta commitar o arquivo:

| Estágio | Script | Dono |
|---|---|---|
| Dependências | `scripts/ci/deps.sh` | Gabriel |
| Testes | `scripts/ci/testes.sh` | Daniele |
| Empacotar | `scripts/ci/empacotar.sh` | Eduardo |
| Construir imagem | `scripts/ci/imagem.sh` | Eduardo |
| Smoke test | `scripts/ci/smoke.sh` | Samile |
| Publicar no Docker Hub | `scripts/ci/publicar.sh` | Lima |
| Notificar | `scripts/ci/notificar.js` | Lima |

Todo script usa `scripts/ci/_comum.sh`, que traz `log`, `ok`, `aviso`,
`falhar`, `exigir_comando` e `exigir_env`. Modelo:

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_comum.sh"
cd "$RAIZ_REPO"

etapa "Meu estágio"
# ...
ok "pronto"
```

Teste o seu na sua máquina antes de subir — é muito mais rápido que esperar o
Jenkins:

```bash
bash scripts/ci/testes.sh
```

---

## Problemas conhecidos

### O Jenkins não consegue rodar `docker`

Sintoma: `permission denied while trying to connect to the Docker daemon socket`.

O usuário `jenkins` precisa pertencer ao grupo dono de `/var/run/docker.sock`,
e o GID desse grupo muda de máquina para máquina.

**Linux / WSL2** — descubra o GID e reconstrua:

```bash
stat -c '%g' /var/run/docker.sock     # ex.: 988
echo "DOCKER_GID=988" >> .env
docker compose -f docker-compose.jenkins.yml up -d --build
```

**Docker Desktop (Windows/macOS)** — use `DOCKER_GID=0`. Verificado em
03/11/2026 na máquina do Gabriel (Docker Desktop 29.5.2): o socket é
`root:root`, modo `660`, ou seja GID `0`. Com esse valor o Dockerfile coloca o
usuário `jenkins` no *grupo* root — o que dá acesso ao socket sem rodar o
container como usuário root. Para conferir na sua máquina:

```bash
MSYS_NO_PATHCONV=1 docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  alpine sh -c 'stat -c "GID=%g %U:%G modo=%a" /var/run/docker.sock'
```

Se ainda assim falhar, rode o container como root
acrescentando `user: root` ao serviço `jenkins` no compose. É aceitável para
um projeto de disciplina, mas registre como decisão consciente: em produção
não se faz isso, porque dá ao Jenkins controle total do daemon do host.

Para conferir de dentro do container:

```bash
docker exec -it codex-jenkins docker ps
```

Se listar containers, está resolvido.

### `docker run -v /var/run/docker.sock...` falha no Git Bash

Sintoma, rodando comandos Docker à mão no Git Bash (Windows):

```
docker: Error response from daemon: mkdir C:\Program Files\Git\var: Acesso negado.
```

O Git Bash converte caminhos no estilo Unix para caminhos Windows antes de
entregá-los ao `docker.exe`, e `/var/run/docker.sock` vira
`C:\Program Files\Git\var\run\docker.sock`. Desligue a conversão só naquele
comando:

```bash
MSYS_NO_PATHCONV=1 docker run --rm -v /var/run/docker.sock:/var/run/docker.sock alpine sh -c 'stat -c "%g %U %G" /var/run/docker.sock'
```

Isso **não** afeta o `docker compose`: ali o caminho está dentro do YAML, que o
Git Bash não toca. Só atrapalha comandos digitados no terminal. Usando
PowerShell ou CMD, o problema não existe.

### O job não aparece na interface

O JCasC não foi aplicado. Procure o erro nos logs:

```bash
docker compose -f docker-compose.jenkins.yml logs jenkins | grep -i -A5 "casc\|configuration-as-code"
```

Causas comuns: erro de indentação no `casc.yaml`, variável obrigatória vazia no
`.env`, ou o plugin `job-dsl` ausente do `plugins.txt`.

### O Jenkins pede a senha inicial de `initialAdminPassword`

O assistente de primeira execução não foi desligado — significa que o
`JAVA_OPTS` do Dockerfile não chegou ao processo. Confirme com:

```bash
docker exec -it codex-jenkins printenv JAVA_OPTS CASC_JENKINS_CONFIG
```

### Mudei o `casc.yaml` e nada mudou

A configuração é lida no boot. Reinicie:

```bash
docker compose -f docker-compose.jenkins.yml restart jenkins
```

Ou, pela interface, *Manage Jenkins → Configuration as Code → Reload existing
configuration*.

---

## Para a defesa

Perguntas prováveis sobre este diretório e o que mostrar:

- **"Essa configuração foi feita na mão?"** → `casc.yaml`, bloco `jobs:`. O job
  nasce do código; qualquer edição pela interface se perde no próximo boot.
- **"Onde o Node foi instalado?"** → `Dockerfile`, bloco `apt-get`. Exigência
  literal do enunciado 3.1.
- **"Onde está o e-mail de destino?"** → em lugar nenhum do código. O caminho é
  `.env` → `docker-compose` → `casc.yaml` (`globalNodeProperties`) → pipeline →
  `scripts/ci/notificar.js`.
- **"Por que a lógica não está dentro do Jenkinsfile?"** → cinco pessoas
  trabalhando em paralelo sem conflito de merge, e cada estágio roda local
  antes de ir ao Jenkins.
