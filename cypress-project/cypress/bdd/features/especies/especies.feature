# language: pt

Funcionalidade: Busca e Detalhe de Espécies
  Como um usuário do Codex Estelar
  Quero buscar espécies e ver seu planeta natal
  Para conhecer mais sobre os povos da galáxia

  Contexto:
    Dado que acesso a página de Espécies

  Cenário: Selecionar a espécie Human mostra o planeta natal Coruscant
    Quando busco por "Human" em Espécies
    E seleciono o primeiro resultado
    Então devo ver o planeta natal "Coruscant" no detalhe

  Cenário: Buscar por uma espécie inexistente não retorna nenhum resultado
    Quando busco por "zzzzzz" em Espécies
    Então devo ver a mensagem "Nenhuma espécie encontrada."
