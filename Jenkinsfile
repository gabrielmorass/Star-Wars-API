#!/usr/bin/env groovy
/*
 * Pipeline CI/CD — Codex Estelar · Projeto S07 NP2
 * ============================================================================
 *
 * REGRA DO GRUPO: este arquivo só ORQUESTRA. A lógica de cada etapa mora em
 * scripts/ci/, com UM DONO por script. Três motivos:
 *
 *   1. cinco pessoas mexem no pipeline sem conflito de merge neste arquivo;
 *   2. cada um testa o próprio estágio na máquina, sem esperar o Jenkins:
 *          bash scripts/ci/testes.sh
 *   3. o enunciado (3.1) exige que a notificação seja feita por "um script na
 *      linguagem da escolha do grupo" — então script é o padrão da casa.
 *
 * COMO ESTE ARQUIVO EVOLUI
 * Cada estágio chama `etapa(...)`, que procura o script do dono:
 *   - script existe  → roda;
 *   - não existe     → imprime um aviso dizendo de quem é e segue verde.
 * Ou seja: ninguém precisa editar o Jenkinsfile para o estágio ativar. Basta
 * criar o arquivo em scripts/ci/ e commitar. O pipeline acende sozinho.
 *
 * ETAPAS OBRIGATÓRIAS DO ENUNCIADO (3.1): Testes · Build/empacotamento ·
 * Notificação por e-mail. É PROIBIDO criar etapa pela interface do Jenkins.
 */

pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10'))
    disableConcurrentBuilds()
  }

  environment {
    APP_NAME   = 'codex-estelar'
    API_DIR    = 'api'

    // Imagem publicada no Docker Hub. O nome definitivo é o combinado entre
    // Eduardo (Bloco B) e Lima (Bloco E) — ver docs-local/plano-np2-devops.docx.
    IMAGE_REPO = "${env.DOCKERHUB_USER ?: 'codexestelar'}/codex-estelar-api"
    IMAGE_TAG  = "${env.BUILD_NUMBER}"

    // Artefatos (critério 4).
    // JUNIT_GLOB cobre os dois estágios de teste de uma vez: o relatório do
    // Newman (contratos da SWAPI) e o dos testes unitários do BFF, quando a
    // Daniele entregar. Padrões separados por vírgula; ausentes são ignorados.
    COBERTURA_DIR  = 'api/coverage/lcov-report'
    JUNIT_GLOB     = 'api/relatorios/junit.xml,api-testing/relatorios/newman-junit.xml'
    RELATORIO_API  = 'api-testing/relatorios/newman.html'
    PACOTE_GLOB    = 'dist/*.tgz'
  }

  stages {

    stage('Checkout') {
      steps {
        // Limpa o workspace ANTES de qualquer coisa.
        //
        // Sem isso, o Jenkins reaproveita o diretório da execução anterior e
        // sobras de um build passam a contaminar o seguinte: já aconteceu
        // aqui, no build #7, que arquivou um dist/codex-estelar-5.tgz gerado
        // no build #5 e ficou UNSTABLE por causa de um junit.xml velho.
        //
        // Limpamos no início, e não no fim, porque um build abortado no meio
        // não executaria o bloco post — e deixaria a sujeira para o próximo.
        cleanWs()

        // O SCM vem do job criado por JCasC (jenkins/casc.yaml).
        checkout scm
        script {
          env.GIT_SHA_CURTO = sh(
            script: 'git rev-parse --short HEAD', returnStdout: true
          ).trim()
          // GIT_BRANCH é preenchido pelo plugin git; BRANCH_NAME só existe em
          // pipeline multibranch, por isso não serve aqui.
          env.BRANCH_ATUAL = sh(
            script: 'git rev-parse --abbrev-ref HEAD', returnStdout: true
          ).trim()
          echo "Commit: ${env.GIT_SHA_CURTO} · Ref: ${env.GIT_BRANCH ?: env.BRANCH_ATUAL}"
        }
      }
    }

    stage('Dependências') {
      steps { script { etapa('Dependências', 'Gabriel', 'scripts/ci/deps.sh') } }
    }

    // ---- ETAPA OBRIGATÓRIA 1: execução dos testes ----
    //
    // São DOIS estágios, com propósitos diferentes — e saber distinguir os
    // dois é resposta de defesa:
    //
    //   Testes de API    valida os contratos da SWAPI, a API externa que a
    //                    aplicação consome. Não executa código nosso.
    //   Testes unitários cobre o NOSSO código (o BFF), com o portão de 90%
    //                    que o critério 1 exige.
    stage('Testes de API') {
      steps { script { etapa('Testes de API', 'Gabriel', 'scripts/ci/testes-api.sh') } }
    }

    stage('Testes unitários') {
      steps { script { etapa('Testes unitários', 'Daniele', 'scripts/ci/testes.sh') } }
    }

    // ---- ETAPA OBRIGATÓRIA 2: build / empacotamento ----
    stage('Empacotar') {
      steps { script { etapa('Empacotar', 'Eduardo', 'scripts/ci/empacotar.sh') } }
    }

    stage('Construir imagem') {
      steps { script { etapa('Construir imagem', 'Eduardo', 'scripts/ci/imagem.sh') } }
    }

    // TEMPORÁRIO — REMOVER O catchError ATÉ 13/11 (Portão 3).
    //
    // O smoke test sobe web + api + redis. Enquanto o Bloco B não publicar a
    // imagem da api e o Bloco E não entregar a pasta web/, ele falha por
    // dependência ausente, não por regressão — e deixaria a main vermelha
    // durante dias, o que faz o time parar de olhar para a cor da build.
    //
    // Com o catchError, a falha vira UNSTABLE (amarelo) em vez de FAILURE:
    // continua visível e continua incomodando, mas não confunde "ambiente
    // incompleto" com "alguém quebrou alguma coisa".
    //
    // AMARELO E NÃO VERDE DE PROPÓSITO. Engolir para verde esconderia uma
    // etapa que o enunciado exige funcionando (critério 3).
    //
    // Combinado com a Samile, dona do script, em 10/11. O script dela não foi
    // alterado: a tolerância vive aqui, num único lugar, e sai com uma linha.
    stage('Smoke test') {
      steps {
        script {
          catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE',
                     message: 'Smoke test falhou — esperado enquanto a imagem da api e a pasta web/ não existirem') {
            etapa('Smoke test', 'Samile', 'scripts/ci/smoke.sh')
          }
        }
      }
    }

    stage('Publicar no Docker Hub') {
      steps { script { etapa('Publicar no Docker Hub', 'Lima', 'scripts/ci/publicar.sh') } }
    }
  }

  post {
    // ---- ARTEFATOS (critério 4) — dona: Daniele (Bloco C) ----
    // Fica em `always` para que o relatório de teste seja arquivado inclusive
    // quando a build falha: é justamente aí que ele é mais útil.
    always {
      script {
        arquivarSeExistir(env.PACOTE_GLOB, 'pacote')
        arquivarSeExistir(env.RELATORIO_API, 'relatório de API')

        // allowEmptyResults deixa a build seguir quando nenhum dos relatórios
        // existe ainda. Quando existe, um caso falhando marca a build como
        // UNSTABLE — amarelo, que é o correto: os passos rodaram, mas um
        // teste reprovou.
        junit allowEmptyResults: true, testResults: env.JUNIT_GLOB

        if (fileExists(env.COBERTURA_DIR)) {
          publishHTML(target: [
            reportDir            : env.COBERTURA_DIR,
            reportFiles          : 'index.html',
            reportName           : 'Cobertura de testes',
            keepAll              : true,
            alwaysLinkToLastBuild: true,
            allowMissing         : true
          ])
        } else {
          echo "[artefatos] ${env.COBERTURA_DIR} ainda não existe (Daniele · Bloco C)."
        }
      }
    }

    // ---- ETAPA OBRIGATÓRIA 3: notificação por e-mail — dono: Lima ----
    // Em `cleanup` para rodar por último, depois de os artefatos existirem.
    // Dispara em sucesso E em falha: pipeline que só avisa quando dá certo
    // não cumpre o requisito.
    cleanup {
      script {
        if (fileExists('scripts/ci/notificar.js')) {
          withCredentials([usernamePassword(
            credentialsId: 'smtp',
            usernameVariable: 'SMTP_USER',
            passwordVariable: 'SMTP_PASS'
          )]) {
            // O destinatário NUNCA é passado como literal: vem do ambiente,
            // injetado pelo JCasC a partir do .env (critério 5).
            sh """
              node scripts/ci/notificar.js \
                --status "${currentBuild.currentResult}" \
                --build  "${env.BUILD_NUMBER}" \
                --job    "${env.JOB_NAME}" \
                --commit "${env.GIT_SHA_CURTO ?: '-'}" \
                --url    "${env.BUILD_URL}"
            """
          }
        } else {
          echo '''
          ┌──────────────────────────────────────────────────────────────
          │ ETAPA OBRIGATÓRIA AINDA PENDENTE: Notificação por e-mail
          │ Dono: Lima (Bloco E)
          │ Criar: scripts/ci/notificar.js
          │ Atenção: o destinatário deve vir de EMAIL_DESTINATARIO,
          │ nunca escrito no código (critério 5 do enunciado).
          └──────────────────────────────────────────────────────────────
          '''.stripIndent()
        }
      }
    }
  }
}

// ============================================================================
// Auxiliares
// ============================================================================

/**
 * Roda o script da etapa se ele já existir; senão avisa de quem é e segue.
 *
 * É o que permite o pipeline ficar verde desde o primeiro dia e ir acendendo
 * conforme cada integrante entrega o seu script — sem ninguém precisar mexer
 * neste arquivo e sem conflito de merge.
 */
def etapa(String nome, String dono, String caminho) {
  if (fileExists(caminho)) {
    echo "[${nome}] executando ${caminho} (dono: ${dono})"
    sh "bash ${caminho}"
  } else {
    echo """
    ┌──────────────────────────────────────────────────────────────
    │ ETAPA AINDA NÃO IMPLEMENTADA: ${nome}
    │ Dono: ${dono}
    │ Criar o arquivo: ${caminho}
    │
    │ Assim que ele for commitado, este estágio passa a executá-lo
    │ automaticamente. Não é preciso editar o Jenkinsfile.
    └──────────────────────────────────────────────────────────────
    """.stripIndent()
  }
}

/** Arquiva um padrão de arquivos se houver correspondência. */
def arquivarSeExistir(String padrao, String rotulo) {
  def achou = sh(script: "ls -1 ${padrao} 2>/dev/null | head -1", returnStdout: true).trim()
  if (achou) {
    archiveArtifacts artifacts: padrao, fingerprint: true, allowEmptyArchive: false
    echo "[artefatos] ${rotulo} arquivado: ${achou}"
  } else {
    echo "[artefatos] nenhum ${rotulo} em ${padrao} (Eduardo · Bloco B)."
  }
}
