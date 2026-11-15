# language: pt

Funcionalidade: Integração de Espécies com o BFF
  Como um usuário do Codex Estelar
  Quero consultar as espécies e seu planeta natal pelo backend do projeto
  Para receber a apresentação em português sem acessar a SWAPI diretamente

  Cenário: TC-118 — Exibir a tradução e o planeta natal recebidos do BFF real
    Dado que acesso Espécies pelo BFF real
    Quando filtro espécies por mamíferos
    E busco por "Human" em Espécies
    E seleciono o primeiro resultado
    Então devo ver a apresentação retornada pelo BFF real
    E o planeta natal deve ser carregado pelo BFF real
    E nenhuma consulta direta à SWAPI deve ser feita

  Cenário: TC-119 — Falha do BFF mostra erro sem recorrer diretamente à SWAPI
    Dado que o BFF de Espécies responde com erro
    Então devo ver a mensagem "Não foi possível carregar as espécies."
    E nenhuma consulta direta à SWAPI deve ser feita
