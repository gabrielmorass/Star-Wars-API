# language: pt

Funcionalidade: Linha do tempo de Personagens
  Como um usuário do Codex Estelar
  Quero ver os personagens posicionados por ano de nascimento
  Para entender a cronologia da saga

  Contexto:
    Dado que acesso a página de Personagens

  Cenário: TC-021 — Alternar para a linha do tempo troca a grade pelo eixo
    Quando alterno para a linha do tempo
    Então a grade de cards não deve estar visível
    E devo ver o contador no formato da linha do tempo

  Cenário: TC-022 — O contador separa quem tem ano de quem não tem
    Quando alterno para a linha do tempo
    Então a contagem do contador deve bater com os avatares desenhados

  Cenário: TC-023 — A busca continua valendo na linha do tempo
    Quando alterno para a linha do tempo
    E busco por "Skywalker"
    Então devo ver no máximo 5 personagens posicionados no eixo

  Cenário: TC-024 — Clicar num personagem do eixo abre o modal dele
    Quando alterno para a linha do tempo
    E abro o primeiro personagem do eixo
    Então o modal do personagem deve estar aberto

  Cenário: TC-056 — Buscar um nome inexistente na linha do tempo esvazia o eixo
    Quando alterno para a linha do tempo
    E busco por "zzzzzz"
    Então não devo ver nenhum personagem no eixo
    E o contador deve indicar 0 com ano

  Cenário: TC-057 — O filtro de espécie vale na linha do tempo e o contador fecha com a grade
    Quando filtro personagens por espécie "droid"
    E guardo a quantidade atual de cards
    E alterno para a linha do tempo
    Então a soma do contador deve ser igual à quantidade original

  Cenário: TC-058 — "Ver tudo" traz para o eixo quem nasceu antes de 120BBY
    Quando alterno para a linha do tempo
    E amplio a linha do tempo para ver tudo
    Então o chip dos que nasceram antes de 120BBY não deve existir
    E devo ver "Yoda" no eixo
