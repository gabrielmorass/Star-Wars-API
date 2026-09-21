# language: pt

Funcionalidade: Modal de Filmes e texto de abertura
  Como um usuário do Codex Estelar
  Quero ler o texto de abertura e explorar o elenco de cada filme
  Para consultar o conteúdo do episódio sem sair da tela

  Contexto:
    Dado que acesso a página de Filmes

  Cenário: TC-029 — O texto de abertura completo fica no DOM ao abrir o filme
    Quando busco pelo filme "New Hope"
    E abro o primeiro filme
    Então o texto de abertura deve estar no DOM
    E o texto de abertura deve conter "It is a period of civil war"

  Cenário: TC-030 — O texto de abertura continua no DOM em outra aba
    Quando busco pelo filme "New Hope"
    E abro o primeiro filme
    E abro a aba "species"
    Então o texto de abertura deve conter "It is a period of civil war"

  Cenário: TC-031 — O texto de abertura continua no DOM com o crawl pausado
    Quando busco pelo filme "New Hope"
    E abro o primeiro filme
    E pauso o crawl
    Então o crawl deve estar pausado
    E o texto de abertura deve conter "It is a period of civil war"

  Cenário: TC-032 — Retomar o crawl volta a rodar
    Quando busco pelo filme "New Hope"
    E abro o primeiro filme
    E pauso o crawl
    E pauso o crawl
    Então o crawl deve estar rodando

  Cenário: TC-033 — A aba Elenco carrega os personagens do filme
    Quando busco pelo filme "New Hope"
    E abro o primeiro filme
    E abro a aba "cast"
    Então devo ver o elenco carregado

  Cenário: TC-034 — A aba Planetas carrega os planetas do filme
    Quando busco pelo filme "New Hope"
    E abro o primeiro filme
    E abro a aba "planets"
    Então devo ver os planetas carregados

  Cenário: TC-063 — A aba Naves e Veículos carrega as naves do filme
    Quando busco pelo filme "New Hope"
    E abro o primeiro filme
    E abro a aba "craft"
    Então devo ver as naves carregadas

  Cenário: TC-064 — A aba Espécies carrega as espécies do filme
    Quando busco pelo filme "New Hope"
    E abro o primeiro filme
    E abro a aba "species"
    Então devo ver as espécies carregadas

  Cenário: TC-065 — O botão de fechar encerra o modal do filme
    Quando busco pelo filme "New Hope"
    E abro o primeiro filme
    E fecho o modal do filme
    Então o modal do filme deve estar fechado

  Cenário: TC-066 — Um nome do elenco leva a Personagens já com o modal dele aberto
    Quando busco pelo filme "New Hope"
    E abro o primeiro filme
    E abro a aba "cast"
    E abro o primeiro personagem do elenco
    Então devo estar em Personagens com o modal do personagem que abri
