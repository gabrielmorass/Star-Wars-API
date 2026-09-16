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
