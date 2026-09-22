# language: pt

Funcionalidade: Super Trunfo com dois jogadores no mesmo aparelho
  Como dois usuários do Codex Estelar
  Queremos jogar Super Trunfo passando um só aparelho
  Para ninguém ver a carta do outro antes da revelação

  Cenário: TC-104 — Depois de perder a rodada, a tela pede para passar o aparelho
    Dado que abro o Super Trunfo com "?maos=12,5|10,3&cpuDelay=0"
    Quando começo uma partida de dois jogadores no mesmo aparelho
    E escolho o atributo "hyperdrive_rating"
    E passo para a próxima rodada
    Então devo ver a cobertura pedindo o aparelho para "Jogador 2"

  Cenário: TC-105 — Nenhuma das duas cartas fica visível atrás da cobertura
    Dado que abro o Super Trunfo com "?maos=12,5|10,3&cpuDelay=0"
    Quando começo uma partida de dois jogadores no mesmo aparelho
    E escolho o atributo "hyperdrive_rating"
    E passo para a próxima rodada
    Então nenhuma das duas cartas deve estar visível

  Cenário: TC-106 — Depois de "Estou pronto", só a carta de quem escolhe está aberta
    Dado que abro o Super Trunfo com "?maos=12,5|10,3&cpuDelay=0"
    Quando começo uma partida de dois jogadores no mesmo aparelho
    E escolho o atributo "hyperdrive_rating"
    E passo para a próxima rodada
    E confirmo que estou pronto
    Então a cobertura não deve mais aparecer
    E a carta de "j2" deve estar aberta
    E a carta de "j1" deve estar virada

  Cenário: TC-107 — Os nomes digitados aparecem na vez e na tela de fim
    Dado que abro o Super Trunfo com "?maos=12|10&cpuDelay=0"
    Quando informo "Ana" e "Beto" como nomes dos jogadores
    E começo uma partida de dois jogadores no mesmo aparelho
    Então a indicação da vez deve conter "Ana"
    Quando escolho o atributo "hyperdrive_rating"
    E passo para a próxima rodada
    Então a tela de fim de partida deve conter "Beto"
