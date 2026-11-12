// Bootstrap do BFF — Codex Estelar
//
// Única responsabilidade: abrir a porta. Toda a lógica está no app.js
// (separado para os testes poderem importar o app sem subir servidor).

const app = require('./app');

// Porta vem do ambiente (.env.example / docker-compose.yml), nunca fixa no
// código. 3000 é só o padrão para rodar local sem configurar nada.
const PORT = Number(process.env.PORT) || 3000;

const servidor = app.listen(PORT, () => {
  console.log(`[api] Codex Estelar BFF ouvindo na porta ${PORT}`);
});

// No container o Node é o processo PID 1, e o PID 1 NÃO tem tratamento
// padrão de SIGTERM: sem isto, "docker stop" espera 10 s e mata com SIGKILL.
// Aqui fechamos o servidor (termina as requisições em andamento) e saímos.
function encerrar(sinal) {
  console.log(`[api] ${sinal} recebido, encerrando`);
  servidor.close(() => process.exit(0));
}
process.on('SIGTERM', () => encerrar('SIGTERM'));
process.on('SIGINT', () => encerrar('SIGINT'));
