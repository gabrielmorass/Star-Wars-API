# language: pt

Funcionalidade: Começar e reiniciar uma partida de Super Trunfo
  Como um usuário do Codex Estelar
  Quero recomeçar a partida e jogar sem o mouse
  Para o jogo servir a qualquer forma de uso

  # `?maos=` vale só para a PRIMEIRA partida da sessão — é isso que deixa este
  # cenário terminar uma partida curta e, em seguida, conferir a distribuição
  # normal de 18 × 18.
  Cenário: TC-108 — "Jogar de novo" volta à tela inicial e distribui 18 × 18
    Dado que abro o Super Trunfo com "?maos=12|10&cpuDelay=0"
    Quando começo uma partida contra o computador
    E escolho o atributo "hyperdrive_rating"
    E passo para a próxima rodada
    Então a tela de fim de partida deve conter "venceu"
    Quando escolho jogar de novo
    Então devo ver a tela inicial do Super Trunfo
    Quando começo uma partida contra o computador
    Então o placar deve ser 18 a 18
    E as cartas em jogo devem somar 36

  Cenário: TC-109 — A partida inteira funciona só com o teclado
    Dado que abro o Super Trunfo com "?maos=10|12&cpuDelay=0"
    Quando levo o foco para o botão de jogar contra o computador
    E aciono o controle em foco
    Então o foco deve estar num atributo disponível
    Quando aciono o controle em foco
    Então o foco deve estar no botão de próxima rodada
    Quando aciono o controle em foco
    Então o foco deve estar no botão de jogar de novo
    E a tela de fim de partida deve conter "venceu"
    Quando aciono o controle em foco
    Então devo ver a tela inicial do Super Trunfo
