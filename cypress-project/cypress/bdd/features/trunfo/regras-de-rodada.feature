# language: pt

Funcionalidade: Regras de disputa do Super Trunfo
  Como um usuário do Codex Estelar
  Quero que a disputa siga as regras combinadas
  Para o resultado de cada rodada ser sempre explicável

  # Cada cenário força as duas mãos com `?maos=<ids-j1>|<ids-j2>`: assim a
  # regra em teste aparece na primeira rodada, sem depender de uma semente
  # sortuda. Os ids são os da url da SWAPI (…/starships/<id>).

  Cenário: TC-098 — Atributo desconhecido na própria carta não pode ser escolhido
    Dado que abro o Super Trunfo com "?maos=13,5|12,3&cpuDelay=0"
    Quando começo uma partida contra o computador
    Então a carta de "j1" deve ser a nave "TIE Advanced x1"
    E o atributo "cost_in_credits" deve estar desabilitado
    E o atributo "cost_in_credits" deve mostrar "Desconhecido"
    E o atributo "crew" deve estar disponível

  Cenário: TC-099 — Atributo desconhecido na carta do adversário faz quem escolheu vencer
    Dado que abro o Super Trunfo com "?maos=12,5|13,3&cpuDelay=0"
    Quando começo uma partida contra o computador
    E escolho o atributo "cost_in_credits"
    Então o resultado da rodada deve conter "é desconhecido em TIE Advanced x1"
    Quando passo para a próxima rodada
    Então o placar deve ser 3 a 1

  Cenário: TC-100 — No hiperpropulsor vence o menor valor
    Dado que abro o Super Trunfo com "?maos=10,2|12,3&cpuDelay=0"
    Quando começo uma partida contra o computador
    E escolho o atributo "hyperdrive_rating"
    Então o resultado da rodada deve conter "Millennium Falcon vence em Hiperpropulsor (classe)"
    Quando passo para a próxima rodada
    Então o placar deve ser 3 a 1

  Cenário: TC-101 — A Death Star vence uma carta que não é caça estelar
    Dado que abro o Super Trunfo com "?maos=9,2|3,5&cpuDelay=0"
    Quando começo uma partida contra o computador
    Então a carta de "j1" deve ser a nave "Death Star"
    E a carta de "j1" deve trazer o selo de Super Trunfo
    Quando escolho o atributo "hyperdrive_rating"
    Então o resultado da rodada deve conter "Death Star é o Super Trunfo do baralho"
    Quando passo para a próxima rodada
    Então o placar deve ser 3 a 1

  Cenário: TC-102 — Um caça estelar derrota a Death Star
    Dado que abro o Super Trunfo com "?maos=9,2|12,3&cpuDelay=0"
    Quando começo uma partida contra o computador
    E escolho o atributo "length"
    Então a carta de "j2" deve ser a nave "X-wing"
    E o resultado da rodada deve conter "X-wing é um caça estelar"

  Cenário: TC-103 — Empate manda as duas cartas para o monte, e o vencedor seguinte leva tudo
    Dado que abro o Super Trunfo com "?maos=12,10,5|28,3,11&cpuDelay=0"
    Quando começo uma partida contra o computador
    E escolho o atributo "crew"
    Então o resultado da rodada deve conter "Empate em Tripulação"
    Quando passo para a próxima rodada
    Então o monte de empate deve ter 2 cartas
    E o placar deve ser 2 a 2
    E as cartas em jogo devem somar 6
    Quando escolho o atributo "hyperdrive_rating"
    E passo para a próxima rodada
    Então o placar deve ser 5 a 1
    E o monte de empate deve ter 0 cartas
