# language: pt

Funcionalidade: Busca de Naves e Veículos
  Como um usuário do Codex Estelar
  Quero buscar naves e veículos pelo nome
  Para encontrar rapidamente um item específico

  Contexto:
    Dado que acesso a página de Naves e Veículos

  Cenário: TC-004 — Buscar por um nome parcial na aba Naves retorna a nave correspondente
    Quando busco por "Falcon" em Naves e Veículos
    Então devo ver um único item de Naves e Veículos com o nome "Millennium Falcon"

  Cenário: TC-009 — Buscar por um nome inexistente não retorna nenhum resultado
    Quando busco por "zzzzzz" em Naves e Veículos
    Então devo ver a mensagem "Nenhum nave encontrado."
