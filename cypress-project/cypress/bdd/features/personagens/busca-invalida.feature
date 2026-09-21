# language: pt

Funcionalidade: Buscas inoportunas em Personagens
  Como um usuário do Codex Estelar
  Quero que a busca lide bem com entradas estranhas
  Para que a página nunca quebre nem mostre resultado errado

  Contexto:
    Dado que acesso a página de Personagens

  # Só espaços: o código faz trim(), então vira "busca vazia" e a grade
  # completa deve continuar aparecendo (não pode dar "nenhum resultado").
  Cenário: TC-069 - Buscar só com espaços em branco mantém a grade completa
    Quando guardo a quantidade atual de cards
    E busco por "     "
    Então a quantidade de cards deve voltar à quantidade original

  # Maiúsculas: o código faz toLowerCase(), então "LUKE" acha o Luke.
  Cenário: TC-070 - Buscar em letras maiúsculas encontra o personagem
    Quando busco por "LUKE"
    Então devo ver um único card com o nome "Luke Skywalker"

  # Caractere especial: nenhum personagem tem "%" no nome.
  # O importante é a página NÃO quebrar e mostrar a mensagem normal de vazio.
  Cenário: TC-071 - Buscar por caractere especial não retorna resultado
    Quando busco por "%%%"
    Então devo ver a mensagem "Nenhum personagem encontrado."

  # Tentativa de injetar HTML: o texto é tratado como texto comum, então
  # não acha ninguém e nenhum script é executado.
  Cenário: TC-072 - Buscar por uma tag HTML não quebra a página
    Quando busco por "<script>alert(1)</script>"
    Então devo ver a mensagem "Nenhum personagem encontrado."

  # Texto muito longo: valor extremo (análise de valor limite).
  Cenário: TC-073 - Buscar por um texto muito longo não retorna resultado
    Quando busco por um texto de 300 caracteres
    Então devo ver a mensagem "Nenhum personagem encontrado."

  # Limpar a busca depois de uma busca sem resultado: a grade tem que voltar.
  Cenário: TC-074 - Limpar a busca depois de uma busca sem resultado restaura a grade
    Quando guardo a quantidade atual de cards
    E busco por "zzzzzz"
    E limpo o campo de busca
    Então a quantidade de cards deve voltar à quantidade original
