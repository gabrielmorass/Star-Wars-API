// App Express do BFF — Codex Estelar
//
// Este arquivo MONTA o app e o exporta, mas NÃO chama listen(). Quem sobe a
// porta é o server.js. A separação existe para os testes (Bloco C): o
// supertest importa este app e faz requisições em memória, sem porta aberta
// e sem conflito entre testes rodando em paralelo.
//
//     const request = require('supertest');
//     const app = require('../src/app');
//     await request(app).get('/api/people/1').expect(200);
//
// PARA ADICIONAR UMA ROTA: crie o arquivo em routes/ e registre abaixo, na
// seção "rotas". Recurso da SWAPI cabe em uma linha (ver routes/people.js).

const express = require('express');

const health = require('./routes/health');
const people = require('./routes/people');
const films = require('./routes/films');

const app = express();

const vehicles = require('./routes/vehicles');
const starships = require('./routes/starships');
const species = require('./routes/species');
const planets = require('./routes/planets');

// Não anuncia "X-Powered-By: Express" a quem fizer a requisição.
app.disable('x-powered-by');

// --- rotas ----------------------------------------------------------------
app.use('/api/health', health);
app.use('/api/people', people);
app.use('/api/films', films);
app.use('/api/vehicles', vehicles);
app.use('/api/starships', starships);
app.use('/api/species', species);
app.use('/api/planets', planets);

// --- rota inexistente -----------------------------------------------------
// Sem isto o Express responde 404 em HTML; o contrato é JSON sempre.
app.use((req, res) => {
  res.status(404).json({ erro: `rota não encontrada: ${req.method} ${req.path}` });
});

// --- tratador de erros ----------------------------------------------------
// Precisa dos QUATRO parâmetros para o Express reconhecê-lo como tratador de
// erro. Erros com .status (ErroSwapi: 404/502) viram essa resposta; qualquer
// outro é bug nosso → 500, sem vazar a mensagem interna para o cliente.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500 && status !== 502) {
    console.error(err);
  }
  res.status(status).json({ erro: status === 500 ? 'erro interno' : err.message });
});

module.exports = app;
