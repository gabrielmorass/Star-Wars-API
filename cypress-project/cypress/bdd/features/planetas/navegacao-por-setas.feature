# language: pt

Funcionalidade: Navegação por setas no Sistema Planetário
  Como um usuário do Codex Estelar
  Quero avançar e retroceder entre os planetas pelas setas do carrossel
  Para explorar a galáxia sem depender da busca

  Contexto:
    Dado que acesso a página de Planetas

  Cenário: TC-052 — Avançar pela seta "próximo" soma um à posição atual
    Quando avanço para o próximo planeta
    Então devo ver a posição "2" do carrossel

  Cenário: TC-053 — Retroceder pela seta "anterior" volta à posição anterior
    Quando avanço para o próximo planeta
    E retrocedo para o planeta anterior
    Então devo ver a posição "1" do carrossel

  Cenário: TC-054 — Retroceder a partir do primeiro planeta dá a volta para o último
    Quando retrocedo para o planeta anterior
    Então devo estar no último planeta do carrossel

  Cenário: TC-055 — Avançar a partir do último planeta dá a volta para o primeiro
    Quando retrocedo para o planeta anterior
    E avanço para o próximo planeta
    Então devo ver a posição "1" do carrossel
