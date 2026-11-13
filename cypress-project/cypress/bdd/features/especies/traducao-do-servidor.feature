# language: pt

Funcionalidade: Apresentação de Espécies com tradução do servidor
  Como um usuário do Codex Estelar
  Quero ver os textos fornecidos pelo BFF
  Para consultar espécies mantendo a busca, os filtros e as cores

  Cenário: TC-114 — Usar textos do servidor preserva filtro e amostras de cores
    Dado que acesso Espécies com dados simulados "traduzidos"
    Quando filtro espécies por mamíferos
    Então apenas a espécie Human deve aparecer na grade
    Quando busco por "Human" em Espécies
    E seleciono o primeiro resultado
    Então devo ver os textos de apresentação do servidor
    E as amostras devem usar os valores originais e os nomes do servidor
    E devo ver o planeta natal "Coruscant" no detalhe

  Cenário: TC-115 — Dados sem ptBR mantêm a apresentação atual
    Dado que acesso Espécies com dados simulados "sem tradução"
    Quando busco por "Human" em Espécies
    E seleciono o primeiro resultado
    Então a tradução local de Espécies deve continuar disponível

  Cenário: TC-116 — Textos recebidos são exibidos como texto
    Dado que acesso Espécies com dados simulados "com marcação"
    Quando busco por "Human" em Espécies
    E seleciono o primeiro resultado
    Então a marcação da tradução deve aparecer como texto sem criar elementos

  Cenário: TC-117 — Cores ausentes não criam amostras visuais
    Dado que acesso Espécies com dados simulados "traduzidos"
    Quando busco por "Droid" em Espécies
    E seleciono o primeiro resultado
    Então as cores ausentes devem mostrar texto sem amostras
