# language: pt

Funcionalidade: Navegação no Sistema Planetário
  Como um usuário do Codex Estelar
  Quero navegar e buscar planetas pelo nome
  Para explorar o sistema planetário da saga

  Contexto:
    Dado que acesso a página de Planetas

  Cenário: Buscar por um planeta pelo nome pula direto para ele
    Quando busco pelo planeta "Hoth"
    Então devo ver o planeta "Hoth" em exibição

  Cenário: Buscar por um planeta inexistente não altera o planeta atual
    Dado que o planeta em exibição é "Tatooine"
    Quando busco pelo planeta "zzzzzz"
    Então devo ver o planeta "Tatooine" em exibição
