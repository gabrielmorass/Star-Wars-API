# language: pt

Funcionalidade: Ordenação e modal de Personagens
  Como um usuário do Codex Estelar
  Quero reordenar a grade e navegar entre personagens relacionados
  Para comparar personagens sem voltar para a busca a cada vez

  Contexto:
    Dado que acesso a página de Personagens

  Cenário: TC-025 — Ordenar por altura põe o mais alto primeiro
    Quando ordeno os personagens por "height"
    Então o primeiro card deve ser "Yarael Poof"

  Cenário: TC-026 — Ordenar por nascimento põe o mais velho primeiro
    Quando ordeno os personagens por "birth"
    Então o primeiro card deve ser "Yoda"

  Cenário: TC-027 — Voltar a ordenar por nome restaura a ordem alfabética
    Quando ordeno os personagens por "height"
    E ordeno os personagens por "name"
    Então o primeiro card deve ser "Ackbar"

  Cenário: TC-028 — Uma conexão troca o personagem sem fechar o modal
    Quando busco por "Chewbacca"
    E abro o primeiro resultado
    E abro a primeira conexão do modal
    Então o modal do personagem deve estar aberto
    E o modal não deve mais ser de "Chewbacca"

  Cenário: TC-059 — O botão de fechar encerra o modal
    Quando busco por "Chewbacca"
    E abro o primeiro resultado
    E fecho o modal do personagem
    Então o modal do personagem deve estar fechado

  Cenário: TC-060 — A tecla Esc encerra o modal
    Quando busco por "Chewbacca"
    E abro o primeiro resultado
    E pressiono a tecla Esc
    Então o modal do personagem deve estar fechado

  Cenário: TC-061 — A seta para a direita avança para o próximo personagem sem fechar o modal
    Quando abro o primeiro resultado
    E pressiono a seta para a direita
    Então o modal do personagem deve estar aberto
    E o modal não deve mais ser de "Ackbar"

  Cenário: TC-062 — O planeta natal do modal leva ao Sistema Planetário já no planeta
    Quando busco por "Chewbacca"
    E abro o primeiro resultado
    E abro o planeta natal no modal
    Então devo estar no Sistema Planetário vendo "Kashyyyk"
