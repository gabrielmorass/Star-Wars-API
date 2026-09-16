# language: pt

Funcionalidade: Ordenação e modal de Personagens
  Como um usuário do Codex Estelar
  Quero reordenar a grade e navegar entre personagens relacionados
  Para comparar personagens sem voltar para a busca a cada vez

  Contexto:
    Dado que acesso a página de Personagens

  Cenário: Ordenar por altura põe o mais alto primeiro
    Quando ordeno os personagens por "height"
    Então o primeiro card deve ser "Yarael Poof"

  Cenário: Ordenar por nascimento põe o mais velho primeiro
    Quando ordeno os personagens por "birth"
    Então o primeiro card deve ser "Yoda"

  Cenário: Voltar a ordenar por nome restaura a ordem alfabética
    Quando ordeno os personagens por "height"
    E ordeno os personagens por "name"
    Então o primeiro card deve ser "Ackbar"

  Cenário: Uma conexão troca o personagem sem fechar o modal
    Quando busco por "Chewbacca"
    E abro o primeiro resultado
    E abro a primeira conexão do modal
    Então o modal do personagem deve estar aberto
    E o modal não deve mais ser de "Chewbacca"
