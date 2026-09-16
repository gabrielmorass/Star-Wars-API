# Codex Estelar

Front-end estático (HTML + CSS + JavaScript puro, sem build) conectado à [SWAPI](https://swapi.info) — base do projeto de Qualidade de Software.

## Como rodar o site

Como `js/main.js` usa ES Modules (`import`/`export`), abrir `index.html` direto com duplo-clique (`file://`) pode ser bloqueado pelo navegador. Sirva a pasta com um servidor estático simples:

```bash
# Opção 1 — Python (já vem instalado na maioria dos sistemas)
python3 -m http.server 8080

# Opção 2 — Node
npx http-server . -p 8080
```

Depois acesse `http://localhost:8080`.

## Funcionalidades

- **Sistema planetário** — mapa da galáxia navegável (clique, setas ou busca com autocomplete) com clima, população, espécies presentes e filmes de cada planeta. A ilustração do planeta no painel é gerada em canvas a partir do `terrain` (que decide o tipo: ecumenópole, vulcânico, gigante gasoso, oceânico, árido, gelado, pantanoso, temperado ou rochoso) e do `climate` (que só ajusta o tom e a cor da atmosfera) — é interpretação visual, não imagem de referência
- **Personagens** — grade de 6 colunas com foto, espécie (cor da borda por espécie) e ano de nascimento; busca combinada com filtros de espécie e de filme e ordenação por nome, altura ou nascimento. Alterna entre **grade** e **linha do tempo** (eixo em escala por trechos, empilhamento em colunas de até 6 com leque "+N", faixa separada para quem não tem ano). O modal traz ficha técnica, régua de altura, medidor de massa, aparições com o crawl do filme no hover, naves pilotadas e conexões por planeta e por espécie, navegável com ← → entre os personagens da lista filtrada
- **Filmes** — os 6 episódios como pôsteres 2:3 com arte procedural em SVG por episódio (desenhada no projeto, sem imagem externa), numeral romano, rodapé com contagem de personagens/planetas/naves e as duas primeiras linhas da abertura no hover. Ordenação por lançamento ou cronológica (com animação FLIP) e barra de cronologia galáctica clicável. O modal traz abas: **Abertura** (o crawl em perspectiva, com pausar/reiniciar/tela cheia), **Elenco**, **Planetas**, **Naves e Veículos** e **Espécies**, todas resolvidas sob demanda e com atalho para as outras telas
- **Naves e Veículos** — abas Naves/Veículos, busca por nome, detalhe técnico
- **Espécies** — busca por nome, detalhe com planeta natal resolvido

## Estrutura

```
index.html
css/style.css              # tokens de design e estilos
js/
  main.js                  # roteamento entre views e inicialização
  core/
    api.js                 # fetchJSON/BASE_URL + utilitários usados por mais de uma feature (getPlanetName)
    dom.js                 # estados genéricos de UI (carregando / erro)
    nav-intent.js          # abrir outra view já com um item selecionado (uso único)
    saga.js                # anos da cronologia por episódio (inferência da equipe — ver abaixo)
  features/
    hub/view.js
    planets/{api,view}.js
    planets/planet-art.js  # planeta procedural em canvas (terrain → textura, climate → tom)
    people/{api,view}.js
    people/avatar.js       # cache de retratos + avatar de iniciais, compartilhado entre telas
    films/{api,view}.js
    films/poster-art.js    # arte de pôster por episódio, em SVG
    vehicles/{api,view}.js
    species/{api,view}.js
  fx/
    loop.js                # laço de animação único — todo efeito se inscreve aqui
    decor.js               # fundo decorativo + parallax
    toggle.js              # switch Lado da Luz / Lado Sombrio
src/data/planets-map.json  # região + coordenadas x/y de cada planeta (dado da equipe, não da SWAPI)
public/favicon.svg
cypress-project/           # testes de interface (Cypress + BDD/Gherkin) — ver README próprio
api-testing/                # testes de API (Postman + Newman) — ver README próprio
docs-local/                 # notas internas do grupo (não versionadas — ver .gitignore)
```

## Como rodar os testes

Este projeto tem duas suítes de teste independentes, cada uma com seu
próprio `package.json` e README:

- **[cypress-project/](cypress-project/README.md)** — testes de interface (Cypress 13, BDD/Gherkin, Page Object Model)
- **[api-testing/](api-testing/README.md)** — testes de API (Postman/Newman) contra a SWAPI

Resumo rápido:

```bash
# Testes de interface
cd cypress-project && npm install && npm test

# Testes de API
cd api-testing && npm install && npm test
```

## Decisões de dados (importante para o Plano de Testes)

A SWAPI (`https://swapi.info/api`) cobre apenas os Episódios I–VI e tem limitações que afetam a aplicação:

1. **Não existe campo `species` no planeta.** A lista de "espécies presentes" em cada planeta é **derivada em tempo real** (`js/features/planets/api.js`): buscamos cada morador (`residents`) do planeta e agregamos as espécies encontradas.
2. **Não existe recurso de "eventos".** Usamos a lista de `films` de cada planeta como proxy de "principais acontecimentos".
3. **Não há busca/filtro server-side.** Todas as buscas do site (Personagens, Filmes, Naves e Veículos, Espécies) filtram a lista completa no cliente — a API ignora parâmetros de busca (`?search=`).

4. **A SWAPI não tem coordenadas nem região galáctica.** O mapa da galáxia da tela "Sistema
   planetário" usa `src/data/planets-map.json`, um arquivo **montado pela equipe**, com um registro
   por planeta contendo `name`, `region`, `x` e `y` (x/y em porcentagem do mapa, de 0 a 100).
   O merge com a SWAPI é feito pelo campo `name`.

   - As **regiões** (Deep Core, Core, Colonies, Inner Rim, Expansion Region, Mid Rim, Outer Rim e
     Unknown Regions) seguem a divisão clássica da galáxia no material da franquia; quando a fonte
     é ambígua ou o planeta é obscuro, a escolha foi da equipe.
   - As **coordenadas x/y** são posições de diagramação, escolhidas para o desenho ficar legível.
     Não representam distância, escala nem posição astronômica real.

   Ou seja: **nada disso vem da API** — é inferência da equipe para fins de visualização, e não deve
   ser usado como dado de referência nem como base para asserções de teste sobre a SWAPI. Os únicos
   dados de planeta vindos da API continuam sendo os exibidos no painel de detalhes (clima, terreno,
   população, espécies e aparições).

5. **A SWAPI não traz o ano interno de cada filme.** O recurso `films` só tem `release_date`
   (a estreia no nosso mundo), não o ano da cronologia da saga. Os marcadores da **linha do tempo**
   da tela Personagens usam anos **escolhidos pela equipe**, na contagem relativa à Batalha de Yavin:
   Ep. I 32BBY, Ep. II 22BBY, Ep. III 19BBY, Ep. IV 0BBY, Ep. V 3ABY e Ep. VI 4ABY. Estão em
   `ANOS_FILMES`, em `js/core/saga.js`.

   O eixo em si também é escolha de diagramação, e não é linear. Dos 82 personagens, 43 têm
   `birth_year` e 39 vêm com `"unknown"` (esses ficam na faixa "Desconhecido", fora do eixo).
   Dos 43 datados, 40 nasceram depois de 120BBY e só três antes — Yoda (896BBY), Jabba (600BBY)
   e Chewbacca (200BBY). Num eixo linear de 900 anos, esses 40 viravam um borrão no canto, então:

   - a linha do tempo **abre em "foco"**, com o eixo indo de 120BBY a 10ABY;
   - o botão **"Ver tudo"** mostra desde 900BBY numa **escala por trechos**: 900BBY–120BBY ocupa
     15% da largura e 120BBY–10ABY os outros 85%, com um zigue-zague no ponto em que a escala muda.

   Os mesmos anos posicionam os pontos da **barra de cronologia galáctica** da tela Filmes (eixo de
   40BBY a 10ABY) e aparecem como pílula "Saga:" no modal de cada filme. Para não divergirem, os
   dois lugares leem a mesma tabela, em `js/core/saga.js`.

   O único dado de cronologia que vem da API é o `birth_year`; o recorte, a proporção 15/85 e o
   ponto de corte em 120BBY são decisões de visualização.

   Como nos demais itens: **isso é inferência da equipe**, não deve embasar asserção de teste
   sobre a SWAPI.

Esses pontos constam explicitamente no Plano de Testes (seção de Riscos e Limitações), já que são inferências e limitações conhecidas, não falhas da aplicação.

## Créditos

- **Switch "Lado da Luz / Lado Sombrio"** — arte SVG e coreografia das animações são do pen
  [*Star Wars Toggle*](https://codepen.io/kasperdebruyne), de **Kasper De Bruyne**, sob licença **MIT**.
  No Codex Estelar o código foi portado de TweenMax/TimelineMax para a sintaxe do **GSAP 3**,
  reduzido a ~96px, encapsulado num `<button>` acessível (`role="switch"`) e ligado ao tema do site
  (`js/fx/toggle.js`).
- **Ícones** — [Lucide](https://lucide.dev) (licença ISC), embutidos inline em `js/features/hub/view.js`
  para o projeto seguir sem build nem dependência de CDN em tempo de execução.
- **Fontes Poppins, Inter e Pathway Gothic One** — Google Fonts (Open Font License). A Pathway
  Gothic One é usada só no tooltip com o texto de abertura dos filmes.
- **Arte dos pôsteres de Filmes** — desenhada pela equipe em SVG (`js/features/films/poster-art.js`).
  Não há nenhuma imagem de pôster oficial no projeto: cada episódio é só uma leitura da paleta e do
  cenário dominante do filme.
- **Dados** — [SWAPI](https://swapi.info), API pública e não oficial.
- **GSAP 3 + MorphSVGPlugin** — GreenSock, carregados via cdnjs (plugins liberados a partir da versão 3.13).

> *Star Wars* e seus elementos visuais são marcas da Lucasfilm/Disney. Este é um trabalho
> acadêmico, sem fins comerciais; a licença MIT citada cobre o código dos pens, não as marcas.

## Uso de IA

Este projeto teve apoio de IA (Claude, Anthropic) na geração do código-base do front-end, na reorganização do código por funcionalidade, na correção de um problema de performance no Sistema Planetário, e na criação das suítes de teste de interface (Cypress/BDD) e de API (Postman/Newman). Conforme item 11 do enunciado, isso deve ser declarado na apresentação e o grupo deve dominar o funcionamento de cada arquivo.
