# language: pt

Funcionalidade: Navegação a partir do Hub
  Como um usuário do Codex Estelar
  Quero acessar cada seção a partir dos cards do Hub
  Para explorar o conteúdo da saga

  Contexto:
    Dado que acesso o Hub

  Cenário: TC-039 — Card do Sistema Planetário leva à view correta
    Quando clico no card "planets"
    Então devo ser levado para a página com o título "Sistema planetário | Codex Estelar"

  Cenário: TC-040 — Card de Personagens leva à view correta
    Quando clico no card "people"
    Então devo ser levado para a página com o título "Personagens | Codex Estelar"

  Cenário: TC-041 — Card de Filmes leva à view correta
    Quando clico no card "films"
    Então devo ser levado para a página com o título "Filmes | Codex Estelar"

  Cenário: TC-042 — Card de Naves e Veículos leva à view correta
    Quando clico no card "vehicles"
    Então devo ser levado para a página com o título "Naves e Veículos | Codex Estelar"

  Cenário: TC-043 — Card de Espécies leva à view correta
    Quando clico no card "species"
    Então devo ser levado para a página com o título "Espécies | Codex Estelar"