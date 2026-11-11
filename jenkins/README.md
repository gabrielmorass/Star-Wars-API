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

## Antes de tudo: verifique o ambiente

```bash
bash scripts/ci/verificar-ambiente.sh
```

Confere Docker, Compose, Node, `.env`, o `DOCKER_GID` desta máquina, fins de
linha e portas — e, quando algo está errado, imprime o comando para corrigir.
Rode isso primeiro; economiza a hora que cada um perderia descobrindo sozinho
as armadilhas do Docker no Windows.

## Subir

```bash
cp .env.example .env        # na raiz; preencher ao menos JENKINS_ADMIN_PASSWORD
docker compose up -d --build jenkins
```

A primeira subida leva alguns minutos (baixa a imagem base e os plugins).
Acompanhe:

```bash
docker compose logs -f jenkins
```

Quando aparecer `Jenkins is fully up and running`, abra **http://localhost:8081**
e entre com `JENKINS_ADMIN_ID` / `JENKINS_ADMIN_PASSWORD` do `.env`.

O job **`codex-estelar-np2`** já deve estar lá. Se estiver, o JCasC funcionou.

> **Por que `up -d --build jenkins` e não só `up -d`.** O `docker-compose.yml`
> é único e traz os quatro serviços. Nomeando o serviço, sobe só o Jenkins —
> útil quando se quer trabalhar no pipeline sem levantar o ambiente inteiro.
> Para subir tudo, `docker compose up -d` sem argumento.
>
> O antigo `docker-compose.jenkins.yml` foi apagado em 10/11, quando o compose
> definitivo chegou. O volume continua sendo o mesmo (`codex_jenkins_home`),
> então o histórico de builds atravessou a migração intacto.

## Derrubar

```bash
docker compose stop jenkins   # para SÓ o Jenkins
docker compose down           # derruba os QUATRO serviços, mantém os volumes
docker compose down -v        # derruba e APAGA os volumes
```

Atenção à diferença, que mudou quando passamos a usar o compose único: `down`
não é mais "derrubar o Jenkins", é derrubar o ambiente inteiro. Para mexer só
no Jenkins, use `stop jenkins` ou `restart jenkins`.

A diferença entre `down` e `down -v` é a demonstração do critério 9 (volumes):
depois de `down` sem `-v`, suba de novo e o histórico de builds continua lá.
Com `-v`, o volume `codex_jenkins_home` é apagado e o Jenkins volta zerado —
mas **ainda com o job criado**, porque o job vem do `casc.yaml` e não do volume.

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
docker compose up -d --build jenkins
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

### Mudei o REPO_BRANCH e o build pegou a branch antiga

Acontece de verdade — aconteceu conosco em 04/11. A causa é uma corrida: o
Jenkins começa a responder na porta **antes** de o JCasC terminar de reaplicar
a configuração do job. Se você reiniciar e disparar o build imediatamente, ele
usa a configuração antiga, que veio do volume.

Confira sempre a primeira linha do console, que diz o que foi realmente
baixado:

```
Commit: 6e2e362 · Ref: origin/test/artefatos
```

Se o `Ref` não for o que você esperava, espere o JCasC assentar e dispare de
novo. Para confirmar que a configuração já foi aplicada:

```bash
docker exec codex-jenkins \
  grep -A1 BranchSpec /var/jenkins_home/jobs/codex-estelar-np2/config.xml
```

É também por isso que o `Jenkinsfile` imprime o commit e o ref logo no começo:
sem isso, uma build do código errado passa despercebida.

### O job não aparece na interface

O JCasC não foi aplicado. Procure o erro nos logs:

```bash
docker compose logs jenkins | grep -i -A5 "casc\|configuration-as-code"
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
docker compose restart jenkins
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
