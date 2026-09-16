# language: pt

Funcionalidade: Busca de Filmes
  Como um usuário do Codex Estelar
  Quero buscar filmes pelo título
  Para encontrar rapidamente um episódio específico

  Contexto:
    Dado que acesso a página de Filmes

  Cenário: TC-003 — Buscar por um título parcial retorna o filme correspondente
    Quando busco pelo filme "Empire"
    Então devo ver um único filme com o título "The Empire Strikes Back"

  Cenário: TC-008 — Buscar por um título inexistente não retorna nenhum resultado
    Quando busco pelo filme "zzzzzz"
    Então devo ver a mensagem "Nenhum filme encontrado."
