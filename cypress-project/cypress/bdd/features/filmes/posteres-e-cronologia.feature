# language: pt

Funcionalidade: Pôsteres e cronologia de Filmes
  Como um usuário do Codex Estelar
  Quero ver os episódios como pôsteres e reordená-los
  Para comparar a ordem de lançamento com a ordem da saga

  Contexto:
    Dado que acesso a página de Filmes

  Cenário: TC-035 — A grade mostra os seis episódios como pôsteres desenhados
    Então devo ver 6 filmes na grade
    E todo pôster deve ter arte em SVG, sem imagem externa

  Cenário: TC-036 — A ordem de lançamento começa pelo Episódio IV
    Quando ordeno os filmes por "release"
    Então o primeiro filme deve ser "A New Hope"

  Cenário: TC-037 — A ordem cronológica começa pelo Episódio I
    Quando ordeno os filmes por "chrono"
    Então o primeiro filme deve ser "The Phantom Menace"

  Cenário: TC-038 — Clicar num ponto da cronologia abre o filme correspondente
    Quando clico no primeiro ponto da cronologia
    Então o modal do filme deve ser "The Phantom Menace"

  Cenário: TC-067 — Limpar a busca volta a mostrar os seis pôsteres
    Quando busco pelo filme "New Hope"
    Então devo ver 1 filme na grade
    Quando limpo a busca de filmes
    Então devo ver 6 filmes na grade
