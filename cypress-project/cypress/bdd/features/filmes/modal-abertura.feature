# language: pt

Funcionalidade: Modal de Filmes e texto de abertura
  Como um usuário do Codex Estelar
  Quero ler o texto de abertura e explorar o elenco de cada filme
  Para consultar o conteúdo do episódio sem sair da tela

  Contexto:
    Dado que acesso a página de Filmes

  Cenário: O texto de abertura completo fica no DOM ao abrir o filme
    Quando busco pelo filme "New Hope"
    E abro o primeiro filme
    Então o texto de abertura deve estar no DOM
    E o texto de abertura deve conter "It is a period of civil war"

  Cenário: O texto de abertura continua no DOM em outra aba
    Quando busco pelo filme "New Hope"
    E abro o primeiro filme
    E abro a aba "species"
    Então o texto de abertura deve conter "It is a period of civil war"

  Cenário: O texto de abertura continua no DOM com o crawl pausado
    Quando busco pelo filme "New Hope"
    E abro o primeiro filme
    E pauso o crawl
    Então o crawl deve estar pausado
    E o texto de abertura deve conter "It is a period of civil war"

  Cenário: Retomar o crawl volta a rodar
    Quando busco pelo filme "New Hope"
    E abro o primeiro filme
    E pauso o crawl
    E pauso o crawl
    Então o crawl deve estar rodando

  Cenário: A aba Elenco carrega os personagens do filme
    Quando busco pelo filme "New Hope"
    E abro o primeiro filme
    E abro a aba "cast"
    Então devo ver o elenco carregado

  Cenário: A aba Planetas carrega os planetas do filme
    Quando busco pelo filme "New Hope"
    E abro o primeiro filme
    E abro a aba "planets"
    Então devo ver os planetas carregados
