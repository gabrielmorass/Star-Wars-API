# language: pt

Funcionalidade: Acesso ao Super Trunfo
  Como um usuário do Codex Estelar
  Quero abrir o Super Trunfo pela barra de navegação
  Para jogar uma partida com o baralho de naves

  Cenário: TC-091 — O botão da barra de navegação abre o Super Trunfo
    Dado que abro o Super Trunfo
    Então devo ser levado para a página com o título "Super Trunfo | Codex Estelar"

  # O Super Trunfo de propósito NÃO ganhou um `.hub-card`: a suíte afirma que
  # o Hub tem exatamente cinco (TC-039 a TC-043). Este cenário guarda isso.
  Cenário: TC-092 — O Hub continua com exatamente cinco cards
    Dado que acesso o Hub
    Então o Hub deve continuar com exatamente 5 cards
