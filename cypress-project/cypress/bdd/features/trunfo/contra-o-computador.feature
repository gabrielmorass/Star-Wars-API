# language: pt

Funcionalidade: Super Trunfo contra o computador
  Como um usuário do Codex Estelar
  Quero jogar Super Trunfo contra o computador
  Para disputar as naves da saga sem precisar de um segundo jogador

  # A semente fixa faz a distribuição ser sempre a mesma; `cpuDelay=0` tira a
  # espera de 800 ms do computador. Os dois parâmetros existem só para teste.
  Contexto:
    Dado que abro o Super Trunfo com "?seed=1977&cpuDelay=0"

  Cenário: TC-093 — A partida começa com 18 cartas para cada um e o monte vazio
    Quando começo uma partida contra o computador
    Então o placar deve ser 18 a 18
    E o monte de empate deve ter 0 cartas
    E as cartas em jogo devem somar 36

  Cenário: TC-094 — A carta do computador começa virada
    Quando começo uma partida contra o computador
    Então a carta de "j1" deve estar aberta
    E a carta de "j2" deve estar virada

  Cenário: TC-095 — Com a semente fixa, a primeira carta do jogador 1 é sempre a mesma
    Quando começo uma partida contra o computador
    Então a carta de "j1" deve ser a nave "Naboo fighter"

  Cenário: TC-096 — Escolher um atributo revela a carta do computador
    Quando começo uma partida contra o computador
    E escolho o atributo "max_atmosphering_speed"
    Então a carta de "j2" deve estar aberta
    E o resultado da rodada deve conter "Naboo fighter vence em Velocidade atmosférica (km/h)"

  Cenário: TC-097 — Ao passar a rodada, nenhuma carta se perde nem se duplica
    Quando começo uma partida contra o computador
    E escolho o atributo "max_atmosphering_speed"
    E passo para a próxima rodada
    Então o placar deve ser 19 a 17
    E o monte de empate deve ter 0 cartas
    E as cartas em jogo devem somar 36

  # `cpuDelay=4000` abre uma janela larga em que a vez é do computador e ele
  # ainda não escolheu: X-wing (12) contra Millennium Falcon (10) no
  # hiperpropulsor dá a rodada ao computador.
  Cenário: TC-130 — Na vez do computador, os atributos da carta dele não aparecem
    Dado que abro o Super Trunfo com "?maos=12,5|10,3&cpuDelay=4000"
    Quando começo uma partida contra o computador
    E escolho o atributo "hyperdrive_rating"
    E passo para a próxima rodada
    Então a indicação da vez deve conter "Vez de Computador"
    E a carta de "j2" deve estar virada
    E não deve haver botões de atributo
