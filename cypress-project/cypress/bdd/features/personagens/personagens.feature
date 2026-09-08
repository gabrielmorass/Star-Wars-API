# language: pt

Funcionalidade: Busca de Personagens
  Como um usuário do Codex Estelar
  Quero buscar personagens pelo nome
  Para encontrar rapidamente quem eu procuro na saga

  Contexto:
    Dado que acesso a página de Personagens

  Cenário: Buscar por um nome parcial retorna o personagem correspondente
    Quando busco por "Luke"
    Então devo ver um único card com o nome "Luke Skywalker"

  Cenário: Buscar por um nome inexistente não retorna nenhum resultado
    Quando busco por "zzzzzz"
    Então devo ver a mensagem "Nenhum personagem encontrado."
