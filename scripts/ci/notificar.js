#!/usr/bin/env node
'use strict';

const nodemailer = require('nodemailer');

const STATUS_LABELS = Object.freeze({
  SUCCESS: 'SUCESSO',
  FAILURE: 'FALHA',
  UNSTABLE: 'INSTÁVEL',
  ABORTED: 'ABORTADA',
  UNKNOWN: 'DESCONHECIDO',
});

const REQUIRED_ENV = Object.freeze([
  'EMAIL_DESTINATARIO',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
]);

// Lê e valida somente as variáveis de ambiente usadas pelo envio.
function lerConfiguracao(env = process.env) {
  const ausentes = REQUIRED_ENV.filter((nome) => !String(env[nome] ?? '').trim());
  if (ausentes.length > 0) {
    return { erro: `Variáveis obrigatórias ausentes: ${ausentes.join(', ')}` };
  }

  const porta = Number(env.SMTP_PORT);
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
    return { erro: 'Variável SMTP_PORT deve ser uma porta entre 1 e 65535.' };
  }

  const statusInformado = String(env.BUILD_STATUS ?? '').trim().toUpperCase();
  if (statusInformado && !Object.hasOwn(STATUS_LABELS, statusInformado)) {
    return { erro: 'Variável BUILD_STATUS deve ser SUCCESS, FAILURE, UNSTABLE ou ABORTED.' };
  }

  const status = statusInformado || 'UNKNOWN';
  const commit = String(env.GIT_COMMIT ?? '-').trim().slice(0, 7) || '-';

  return {
    configuracao: {
      destinatario: String(env.EMAIL_DESTINATARIO).trim(),
      host: String(env.SMTP_HOST).trim(),
      porta,
      usuario: String(env.SMTP_USER).trim(),
      senha: String(env.SMTP_PASS),
      remetente: String(env.SMTP_FROM ?? '').trim() || String(env.SMTP_USER).trim(),
      status,
      resultado: STATUS_LABELS[status],
      numero: String(env.BUILD_NUMBER ?? '-').trim() || '-',
      job: String(env.JOB_NAME ?? '-').trim() || '-',
      branch: String(env.GIT_BRANCH ?? '-').trim() || '-',
      commit,
      url: String(env.BUILD_URL ?? '-').trim() || '-',
    },
  };
}

// Monta assunto e corpo em texto simples sem incluir dados de autenticação.
function montarMensagem(configuracao) {
  return {
    from: configuracao.remetente,
    to: configuracao.destinatario,
    subject: `[Codex Estelar] Build #${configuracao.numero} — ${configuracao.resultado}`,
    text: [
      `Job: ${configuracao.job}`,
      `Resultado: ${configuracao.resultado}`,
      `Número da build: ${configuracao.numero}`,
      `Branch: ${configuracao.branch}`,
      `Commit: ${configuracao.commit}`,
      `URL: ${configuracao.url}`,
    ].join('\n'),
  };
}

// Recebe a fábrica do transporte para permitir testes sem conexão de rede.
async function enviarNotificacao(env = process.env, criarTransporte = nodemailer.createTransport) {
  const leitura = lerConfiguracao(env);
  if (leitura.erro) return leitura;

  const { configuracao } = leitura;
  const transporte = criarTransporte({
    host: configuracao.host,
    port: configuracao.porta,
    secure: configuracao.porta === 465,
    auth: {
      user: configuracao.usuario,
      pass: configuracao.senha,
    },
  });

  await transporte.sendMail(montarMensagem(configuracao));
  return { enviado: true };
}

// Executa o envio somente quando este arquivo é o ponto de entrada do Node.
async function main(env = process.env, criarTransporte = nodemailer.createTransport) {
  try {
    const resultado = await enviarNotificacao(env, criarTransporte);
    if (resultado.erro) {
      console.error(`[notificação] ${resultado.erro}`);
      return 1;
    }
    console.log('[notificação] E-mail enviado.');
    return 0;
  } catch {
    // A mensagem SMTP pode conter detalhes sensíveis; não exibimos o erro bruto.
    console.error('[notificação] Falha ao enviar o e-mail SMTP.');
    return 1;
  }
}

module.exports = {
  STATUS_LABELS,
  lerConfiguracao,
  montarMensagem,
  enviarNotificacao,
  main,
};

if (require.main === module) {
  main().then((codigo) => {
    process.exitCode = codigo;
  });
}
