# language: pt

Funcionalidade: Regras puras do Super Trunfo
  Como equipe de qualidade
  Quero exercitar a máquina de estados sem abrir o site
  Para garantir que ela é determinística e serializável

  # Nenhum cenário aqui visita página nenhuma: os passos importam
  # `js/features/trunfo/regras.js` e chamam as funções puras direto.

  Cenário: TC-110 — paraNumero lê os valores como a SWAPI os entrega
    Dado que uso as regras puras do Super Trunfo
    Então o texto "1,600" deve virar o número 1600
    E o texto "10.4 " deve virar o número 10.4
    E o texto "1000km" deve virar o número 1000
    E o texto "30-165" deve virar o número 165
    E o texto "unknown" deve virar um valor desconhecido
    E o texto "n/a" deve virar um valor desconhecido
    E o texto "none" deve virar um valor desconhecido
    E o texto "" deve virar um valor desconhecido

  Cenário: TC-111 — A mesma semente e as mesmas ações dão sempre o mesmo estado
    Dado que jogo uma partida completa com as regras puras
    Então reproduzir as mesmas ações deve devolver o mesmo estado
    E jogar outra vez com a mesma semente deve dar o mesmo estado

  Cenário: TC-112 — O estado sobrevive a uma ida e volta por JSON
    Dado que jogo uma partida completa com as regras puras
    Então o estado inicial deve sobreviver a uma ida e volta por JSON
    E o estado deve sobreviver a uma ida e volta por JSON

  Cenário: TC-113 — aplicarAcao não altera o estado que recebeu
    Dado que uso as regras puras do Super Trunfo
    Então aplicar uma ação não deve alterar o estado recebido

  Cenário: TC-114 — Ação inválida é recusada com uma mensagem que explica o motivo
    Dado que uso as regras puras do Super Trunfo
    Então uma ação do jogador errado deve ser recusada
    E escolher um atributo desconhecido na própria carta deve ser recusado
    E uma ação de tipo desconhecido deve ser recusada
