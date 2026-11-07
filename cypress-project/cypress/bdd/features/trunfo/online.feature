# language: pt

Funcionalidade: Super Trunfo online, em dois aparelhos
  Como um usuário do Codex Estelar
  Quero jogar Super Trunfo com alguém em outro aparelho, por um código de sala
  Para disputar as naves sem precisar dividir a mesma tela

  # O outro aparelho é o transporte fake (`?transporte=fake`): um roteiro de
  # mensagens injetado antes de a página carregar. Com `?seed=1977`, este
  # aparelho (o anfitrião, j1) recebe o Naboo fighter e o oponente (j2), o
  # Star Destroyer — a mesma distribuição do TC-095, fora do modo online.

  Cenário: TC-116 — Sem Supabase configurado, o modo online não aparece e os outros continuam funcionando
    Dado que abro o Super Trunfo com "?seed=1977&cpuDelay=0"
    Então o botão do modo online não deve existir
    Quando começo uma partida contra o computador
    Então o placar deve ser 18 a 18
    Dado que abro o Super Trunfo com "?seed=1977"
    Quando começo uma partida de dois jogadores no mesmo aparelho
    Então o placar deve ser 18 a 18
    E a carta de "j1" deve estar aberta

  Cenário: TC-117 — Criar uma sala mostra um código de 5 caracteres e espera o oponente
    Dado que abro o Super Trunfo online com "?transporte=fake" e o roteiro "oponente que ainda não entrou"
    Quando crio uma sala online
    Então devo ver um código de sala de 5 caracteres sem 0, O, 1, I e L
    E o status da conexão deve ser "Aguardando oponente…"

  Cenário: TC-118 — Quando o oponente entra, a partida começa 18 × 18 com a carta dele virada
    Dado que abro o Super Trunfo online com "?transporte=fake&seed=1977" e o roteiro "oponente que entra"
    Quando informo "Ana" como meu nome
    E crio uma sala online
    E o oponente entra e a partida começa
    Então o placar deve ser 18 a 18
    E a carta de "j1" deve estar aberta
    E a carta de "j2" deve estar virada
    E o status da conexão deve ser "Conectado"

  Cenário: TC-119 — Online e fora dele, a mesma semente dá a mesma distribuição
    Dado que abro o Super Trunfo online com "?transporte=fake&seed=1977" e o roteiro "oponente que entra"
    Quando crio uma sala online
    E o oponente entra e a partida começa
    Então a carta de "j1" deve ser a nave "Naboo fighter"
    E devo ter enviado o início com a semente 1977

  Cenário: TC-120 — Uma escolha local é enviada como "acao" com seq 0
    Dado que abro o Super Trunfo online com "?transporte=fake&seed=1977" e o roteiro "oponente que entra"
    Quando crio uma sala online
    E o oponente entra e a partida começa
    E escolho o atributo "max_atmosphering_speed"
    Então devo ter enviado a escolha de "max_atmosphering_speed" como "j1" com seq 0
    E a carta de "j2" deve ser a nave "Star Destroyer"

  Cenário: TC-121 — Uma jogada do oponente é aplicada e o placar muda
    Dado que abro o Super Trunfo online com "?transporte=fake&seed=1977" e o roteiro "oponente que entra"
    Quando crio uma sala online
    E o oponente entra e a partida começa
    E escolho o atributo "length"
    Então o resultado da rodada deve conter "Star Destroyer vence"
    Quando o oponente passa a rodada como "j2" com seq 1
    Então o placar deve ser 17 a 19
    E a indicação da vez deve conter "Vez de Bia"

  Cenário: TC-122 — Jogada recebida em nome do jogador errado é ignorada
    Dado que abro o Super Trunfo online com "?transporte=fake&seed=1977" e o roteiro "oponente que entra"
    Quando crio uma sala online
    E o oponente entra e a partida começa
    E o oponente escolhe "length" como "j1" com seq 0
    Então a carta de "j2" deve estar virada
    E o placar deve ser 18 a 18
    E a indicação da vez deve conter "Rodada 1 de 40"
    E o atributo "length" deve estar disponível

  Cenário: TC-123 — Jogada repetida (seq menor) é ignorada
    Dado que abro o Super Trunfo online com "?transporte=fake&seed=1977" e o roteiro "oponente que entra"
    Quando crio uma sala online
    E o oponente entra e a partida começa
    E escolho o atributo "length"
    E o oponente passa a rodada como "j2" com seq 1
    Então o placar deve ser 17 a 19
    Quando o oponente passa a rodada como "j2" com seq 1
    E o oponente escolhe "length" como "j1" com seq 0
    Então o placar deve ser 17 a 19
    E a indicação da vez deve conter "Rodada 2 de 40"
    E a indicação da vez deve conter "Vez de Bia"
    E a repetição deve ter sido descartada antes de chegar às regras

  Cenário: TC-124 — Uma lacuna (seq maior) pede sincronia, e a resposta restaura a partida
    Dado que abro o Super Trunfo online com "?transporte=fake&seed=1977" e o roteiro "oponente que entra"
    Quando crio uma sala online
    E o oponente entra e a partida começa
    E o oponente escolhe "length" como "j2" com seq 5
    Então devo ter enviado um pedido de sincronia
    E o placar deve ser 18 a 18
    Quando o oponente sincroniza a partida com "escolher:j1:length, proxima:j2"
    Então o placar deve ser 17 a 19
    E a indicação da vez deve conter "Rodada 2 de 40"

  Cenário: TC-125 — Baralhos diferentes nos dois aparelhos impedem a partida
    Dado que abro o Super Trunfo online com "?transporte=fake" e o roteiro "anfitrião com outro baralho"
    Quando entro na sala " abc23 "
    Então devo ver o erro online "Os dois aparelhos carregaram baralhos diferentes. Recarreguem a página e tentem de novo."
    E nenhuma partida deve ter começado
    E não devo ter enviado nenhuma jogada

  Cenário: TC-126 — Um terceiro aparelho na sala vê que ela está cheia
    Dado que abro o Super Trunfo online com "?transporte=fake" e o roteiro "sala cheia"
    Quando crio uma sala online
    Então devo ver o erro online "Esta sala já está cheia."
    E nenhuma partida deve ter começado

  Cenário: TC-127 — Quando o oponente sai da sala, a partida pausa
    Dado que abro o Super Trunfo online com "?transporte=fake&seed=1977" e o roteiro "oponente que entra"
    Quando crio uma sala online
    E o oponente entra e a partida começa
    Então o placar deve ser 18 a 18
    Quando o oponente sai da sala
    Então devo ver o aviso "Bia desconectou. Aguardando reconexão…"
    E o status da conexão deve ser "Desconectado"
    E os atributos devem estar travados

  Esquema do Cenário: TC-128 — Só quem escolhe a próxima rodada vê "Próxima"
    Dado que abro o Super Trunfo online com "?transporte=fake&seed=1977" e o roteiro "oponente que entra"
    Quando crio uma sala online
    E o oponente entra e a partida começa
    E escolho o atributo "<atributo>"
    Então o resultado da rodada deve conter "<vencedora>"
    E <quem passa>

    Exemplos:
      | atributo          | vencedora               | quem passa                                                         |
      | hyperdrive_rating | Naboo fighter vence     | o botão de próxima rodada deve aparecer para mim                   |
      | length            | Star Destroyer vence    | devo ver "Aguardando Bia…" no lugar do botão de próxima rodada     |

  Cenário: TC-129 — Recarregar a página no meio da partida volta à mesma sala e pede sincronia
    Dado que abro o Super Trunfo online com "?transporte=fake&seed=1977" e o roteiro "oponente que entra"
    Quando crio uma sala online
    E o oponente entra e a partida começa
    E escolho o atributo "length"
    E recarrego a página e o oponente responde ao pedido de sincronia
    Então devo ter enviado um pedido de sincronia
    E o código da sala deve continuar o mesmo
    E a carta de "j2" deve ser a nave "Star Destroyer"
    E devo ver "Aguardando Bia…" no lugar do botão de próxima rodada
