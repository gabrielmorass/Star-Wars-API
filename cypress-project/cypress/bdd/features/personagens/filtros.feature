# language: pt

Funcionalidade: Filtros de Personagens
  Como um usuário do Codex Estelar
  Quero filtrar personagens por espécie e por filme
  Para restringir a grade a quem realmente me interessa

  Contexto:
    Dado que acesso a página de Personagens

  Cenário: TC-046 — Filtrar por Humanos mostra só humanos
    Quando filtro personagens por espécie "human"
    Então todos os cards visíveis devem ser da espécie "Human"

  Cenário: TC-047 — Filtrar por Droides mostra só droides
    Quando filtro personagens por espécie "droid"
    Então todos os cards visíveis devem ser da espécie "Droid"

  Cenário: TC-048 — Filtrar por filme muda a quantidade de personagens exibidos
    Quando guardo a quantidade atual de cards
    E filtro personagens pelo filme "Ep. 4 — A New Hope"
    Então a quantidade de cards deve ser diferente da quantidade original

  Cenário: TC-049 — Combinar filtro de espécie com filtro de filme
    Quando filtro personagens por espécie "human"
    E guardo a quantidade atual de cards
    E filtro personagens pelo filme "Ep. 4 — A New Hope"
    Então todos os cards visíveis devem ser da espécie "Human"
    E a quantidade de cards deve ser diferente da quantidade original

  Cenário: TC-050 — Voltar para "Todos" depois de filtrar restaura a grade completa
    Quando guardo a quantidade atual de cards
    E filtro personagens por espécie "droid"
    E filtro personagens por espécie "all"
    Então a quantidade de cards deve voltar à quantidade original

  Cenário: TC-051 — Buscar por um nome que não existe na espécie filtrada não retorna resultado
    Quando filtro personagens por espécie "droid"
    E busco por "Skywalker"
    Então devo ver a mensagem "Nenhum personagem encontrado."