# 🌌 Codex Estelar

> **"Que a Força esteja com o seu código."**

Front-end estático (HTML + CSS + JavaScript puro, sem build) conectado à [SWAPI](https://swapi.info) — base do projeto de Qualidade de Software do **Inatel**.

---

## 🛠️ Como rodar o site

Como `js/main.js` usa ES Modules (`import`/`export`), abrir `index.html` direto com duplo-clique (`file://`) pode ser bloqueado pelo navegador. Sirva a pasta com um servidor estático simples:

```bash
# Opção 1 — Python (já vem instalado na maioria dos sistemas)
python3 -m http.server 8080

# Opção 2 — Node
npx http-server . -p 8080
```

Depois acesse `http://localhost:8080`.

---

## 🪐 Funcionalidades

- **Sistema planetário** — mapa da galáxia navegável (clique, setas ou busca com autocomplete) com clima, população, espécies presentes e filmes de cada planeta. A ilustração do planeta no painel é gerada em canvas a partir do `terrain` (que decide o tipo: ecumenópole, vulcânico, gigante gasoso, oceânico, árido, gelado, pantanoso, temperado ou rochoso) e do `climate` (que só ajusta o tom e a cor da atmosfera) — é interpretação visual, não imagem de referência
- **Personagens** — grade de 6 colunas com foto, espécie (cor da borda por espécie) e ano de nascimento; busca combinada com filtros de espécie e de filme e ordenação por nome, altura ou nascimento. Alterna entre **grade** e **linha do tempo** (eixo em escala por trechos, empilhamento em colunas de até 6 com leque "+N", faixa separada para quem não tem ano). O modal traz ficha técnica, régua de altura, medidor de massa, aparições com o crawl do filme no hover, naves pilotadas e conexões por planeta e por espécie, navegável com ← → entre os personagens da lista filtrada
- **Filmes** — os 6 episódios como pôsteres 2:3 com arte procedural em SVG por episódio (desenhada no projeto, sem imagem externa), numeral romano, rodapé com contagem de personagens/planetas/naves e as duas primeiras linhas da abertura no hover. Ordenação por lançamento ou cronológica (com animação FLIP) e barra de cronologia galáctica clicável. O modal traz abas: **Abertura** (o crawl em perspectiva, com pausar/reiniciar/tela cheia), **Elenco**, **Planetas**, **Naves e Veículos** e **Espécies**, todas resolvidas sob demanda e com atalho para as outras telas
- **Naves e Veículos** — abas Naves/Veículos, busca, filtro por classe (pills geradas do dado) e ordenação com FLIP; cada card tem a silhueta SVG da classe. O painel traz um **hangar 3D** (Three.js carregado sob demanda, modelo montado com primitivas por classe, arraste para girar; sem WebGL cai na silhueta), medidores em arco normalizados pelo teto da categoria (escala log nas métricas de cauda longa), régua de tamanho, radar de 5 eixos, pilotos e aparições. **Comparar** põe duas naves lado a lado, com painel de **escala real** (as duas silhuetas no mesmo fator de metros, lupa quando a razão passa de 500:1) e tabela de quem vence em cada métrica
- **Espécies** — grade com o glifo da classificação (8 desenhos: mamífero, réptil, anfíbio, insectoide, gastrópode, artificial, senciente, sem classificação) e uma faixa com as cores de pele, cabelo e olhos de cada espécie; busca, filtro por classificação e ordenação por nome, altura ou longevidade. O painel traz réguas de **altura** (linear até 3 m) e **longevidade** (log, de 50 a 1.000 anos) sempre com a marca do humano como referência, as cores como amostras, o planeta natal, os membros conhecidos e as aparições — os três últimos levam à tela correspondente

---

## 🗂️ Estrutura

```
index.html
css/style.css              # tokens de design e estilos
js/
  main.js                  # roteamento entre views e inicialização
  config.js                # chave pública do TMDB (ver "Pôster oficial via TMDB")
  core/
    api.js                 # fetchJSON/BASE_URL + utilitários usados por mais de uma feature (getPlanetName)
    dom.js                 # estados genéricos de UI (carregando / erro)
    nav-intent.js          # abrir outra view já com um item selecionado (uso único)
    saga.js                # anos da cronologia por episódio (inferência da equipe — ver abaixo)
    vocabulario.js         # dicionários pt-BR dos valores da SWAPI (ver "Idioma")
  features/
    hub/view.js
    planets/{api,view}.js
    planets/planet-art.js  # planeta procedural em canvas (terrain → textura, climate → tom)
    people/{api,view}.js
    people/avatar.js       # cache de retratos + avatar de iniciais, compartilhado entre telas
    films/{api,view}.js
    films/poster-art.js    # arte de pôster por episódio, em SVG
    films/tmdb.js          # pôster oficial via TMDB, só de fundo no cabeçalho do modal
    vehicles/{api,view}.js
    vehicles/silhuetas.js  # silhueta SVG por classe, com viewBox próprio
    vehicles/hud.js        # medidores em arco, régua log, radar e tabela de vitórias
    vehicles/escala-real.js# as duas naves da comparação no mesmo fator de metros
    vehicles/hangar.js     # hangar 3D (Three.js r128 sob demanda, modelos por primitivas)
    species/{api,view}.js
    species/glifos.js      # glifo por classificação + nome de cor → valor CSS
  fx/
    loop.js                # laço de animação único — todo efeito se inscreve aqui
    decor.js               # fundo decorativo + parallax
    toggle.js              # switch Lado da Luz / Lado Sombrio
src/data/planets-map.json  # região + coordenadas x/y de cada planeta (dado da equipe, não da SWAPI)
public/favicon.svg
cypress-project/           # testes de interface (Cypress + BDD/Gherkin) — ver README próprio
api-testing/                # testes de API (Postman + Newman) — ver README próprio
performance-testing/        # testes de carga, bônus (k6) — ver README próprio
docs-local/                 # notas internas do grupo (não versionadas — ver .gitignore)
```

---

## 🧪 Como rodar os testes

Este projeto tem três suítes de teste independentes, cada uma com seu
próprio README:

- **[cypress-project/](cypress-project/README.md)** — testes de interface (Cypress 13, BDD/Gherkin, Page Object Model) — 61 cenários
- **[api-testing/](api-testing/README.md)** — testes de API (Postman/Newman) contra a SWAPI — 13 requisições
- **[performance-testing/](performance-testing/README.md)** — testes de carga (k6), bônus — 2 cenários

Resumo rápido:

```bash
# Testes de interface
cd cypress-project && npm install && npm test

# Testes de API
cd api-testing && npm install && npm test

# Testes de performance (bônus — requer k6 instalado à parte, ver README da pasta)
cd performance-testing && k6 run swapi-load.js
```

---

## 📊 Decisões de dados (importante para o Plano de Testes)

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

6. **A lista `people` de cada espécie é parcial.** `species/1` (Human) traz 4 personagens, mas 35
   dos 82 personagens são humanos — a SWAPI deixa o campo `species` deles **vazio** (ver item sobre
   Personagens). Por isso a seção "Membros conhecidos" da tela Espécies não usa `species.people`:
   ela é derivada da lista de personagens (todo mundo cujo `species` aponta para a espécie, mais os
   de `species` vazio quando a espécie é Human), unida à lista da API. As referências das réguas
   (humano com 1,80 m e 120 anos) vêm do próprio registro `species/1`.

Esses pontos constam explicitamente no Plano de Testes (seção de Riscos e Limitações), já que são inferências e limitações conhecidas, não falhas da aplicação.

---

## 🌐 Idioma

A interface é em português e a SWAPI devolve tudo em inglês. A regra que
resolve o encontro dos dois, em uma linha:

> **Nome próprio fica em inglês. Valor de atributo é traduzido.**

`Luke Skywalker`, `Tatooine`, `Millennium Falcon` e `Shyriiwook` são nomes:
traduzir descaracteriza o dado e quebraria a busca, que casa pelo texto que a
API devolve (e é isso que os testes afirmam). Já `arid`, `male`, `gastropod` e
`bogs` não são nomes — são vocabulário controlado, com uma dúzia de valores
possíveis, e aparecem colados a rótulos em português ("Clima", "Classificação").
Esses passam por `traduzir()`.

Os dicionários ficam em `js/core/vocabulario.js`, um só para todas as views:

| Campo | Dicionário | Onde aparece |
|---|---|---|
| `gender`, `hair_color`, `eye_color`, `skin_color` | `GENERO`, `CORES` | modal de Personagens |
| `climate` | `CLIMA` | card do planeta e tooltip do mapa |
| `terrain` | `TERRENO` | card do planeta |
| `classification`, `designation` | `CLASSIFICACAO`, `DESIGNACAO` | grade e detalhe de Espécies |
| `language` | `normalizarLingua()` | grade e detalhe de Espécies |

Três detalhes que valem registro:

- `traduzir()` aceita valor composto (`"mountains, grasslands"`, `"green-tan"`),
  traduzindo peça por peça, e **devolve como veio o que não conhece** — um valor
  novo na API aparece em inglês, mas aparece, em vez de sumir.
- A SWAPI mistura singular e plural para a mesma coisa (`desert`/`deserts`,
  `mammal`/`mammals`) e tem erros de digitação (`artic` sem o primeiro "c",
  `Galatic Basic`). As duas grafias entram no dicionário apontando para a mesma
  saída, então isso não vaza para a tela.
- Nome de língua é nome próprio e não se traduz; `normalizarLingua()` só unifica
  as três grafias de `Galactic Basic` e arruma a caixa alta.

**O que continua em inglês, e por quê:** o `opening_crawl` é o texto do filme
vindo da API (e há teste travando o conteúdo integral no DOM — traduzir seria
inventar dado); títulos de filme, nomes de pessoa, planeta e nave são nomes. O
card do crawl ("Episode IV / A NEW HOPE") é inglês de propósito: ele reproduz o
cartão do filme, então o bloco fica coerente em vez de misturar as duas línguas
numa linha só.

---

## 🎬 Pôster oficial via TMDB

O cabeçalho do modal de Filmes pode usar o pôster oficial do filme como fundo
(desfocado, sob um véu preto de 60%). Esses dados vêm **via TMDB** — o site não
é endossado nem certificado pelo TMDB.

A chave fica em `js/config.js`:

```js
export const TMDB_API_KEY = "";   // cole aqui a sua chave v3
```

Duas coisas importantes:

- **É chave pública de front.** O arquivo é servido ao navegador como qualquer
  outro `.js`, então o que está nele é visível para quem abrir o DevTools. A
  chave v3 do TMDB é justamente do tipo que se usa em cliente. Nada de segredo
  de servidor entra aqui.
- **É opcional.** Com a chave vazia, a busca nem é disparada. Sem rede, sem
  resultado ou com erro na resposta, o `fetch` falha em silêncio e o cabeçalho
  fica com o visual padrão. Nenhum teste depende do pôster.

A grade continua com a arte procedural em SVG (`films/poster-art.js`) —
o TMDB só entra no fundo do cabeçalho. O resultado é guardado em
`sessionStorage` (`codex-estelar:tmdb-poster`), então reabrir o mesmo filme na
mesma sessão não gasta requisição.

---

## 🎖️ Créditos

- **Switch "Lado da Luz / Lado Sombrio"** — arte SVG e coreografia das animações são do pen
  [*Star Wars Toggle*](https://codepen.io/kasperdebruyne), de **Kasper De Bruyne**, sob licença **MIT**.
  No Codex Estelar o código foi portado de TweenMax/TimelineMax para a sintaxe do **GSAP 3**,
  reduzido a ~96px, encapsulado num `<button>` acessível (`role="switch"`) e ligado ao tema do site
  (`js/fx/toggle.js`).
- **Ícones** — [Lucide](https://lucide.dev) (licença ISC), embutidos inline em `js/features/hub/view.js`
  para o projeto seguir sem build nem dependência de CDN em tempo de execução.
- **Fontes Poppins, Inter e Pathway Gothic One** — Google Fonts (Open Font License). A Pathway
  Gothic One é usada no crawl da aba Abertura e no tooltip com o texto de abertura dos filmes.
- **Arte dos pôsteres de Filmes** — desenhada pela equipe em SVG (`js/features/films/poster-art.js`).
  O repositório não guarda nenhuma imagem de pôster oficial: cada episódio é só uma leitura da paleta
  e do cenário dominante do filme. A única imagem oficial que o site pode exibir é a do TMDB, buscada
  em tempo de execução e só como fundo do cabeçalho do modal (ver a seção acima).
- **Dados** — [SWAPI](https://swapi.info), API pública e não oficial.
- **Pôsteres oficiais (fundo do cabeçalho do modal de Filmes)** — dados **via TMDB**
  ([The Movie Database](https://www.themoviedb.org)). Este produto usa a API do TMDB,
  mas não é endossado nem certificado pelo TMDB. Uso opcional, ver a seção acima.
- **GSAP 3 + MorphSVGPlugin** — GreenSock, carregados via cdnjs (plugins liberados a partir da versão 3.13).

> *Star Wars* e seus elementos visuais são marcas da Lucasfilm/Disney. Este é um trabalho
> acadêmico, sem fins comerciais; a licença MIT citada cobre o código dos pens, não as marcas.

---

## 🤖 Uso de IA

Este projeto teve apoio de IA (Claude, via **Claude Code**) ao longo de várias etapas: geração do código-base do front-end, reorganização do código por funcionalidade, correção de um problema de performance no Sistema Planetário, criação das três suítes de teste automatizado (Cypress/BDD para interface, Postman/Newman para API, k6 para performance) e apoio na documentação do projeto (relatório interno de progresso e Plano de Testes). O uso foi transparente e supervisionado: todo código e documento gerado foi revisado, testado e ajustado pelo grupo antes de ser integrado ao projeto. Conforme item 11 do enunciado, isso é declarado aqui e o grupo domina o funcionamento de cada arquivo.

### Modelo utilizado

- **Claude (Anthropic):** via **Claude Code**, extensão de terminal/CLI.

### Exemplos reais de prompts utilizados

**Gabriel Morass**

**Prompt 1: Redesenho do Sistema Planetário**
> "nao gostei da pagina de sistema planetario, ta muito feio, gostaria de algo mais interativo, algo que voce passe setas pro lado para mudar de planeta"

Aceita com ajustes: a IA reformulou a tela de Planetas para um mapa/carrossel navegável (clique, setas, busca com autocomplete); o redesenho visual completo (regiões, coordenadas, arte procedural) veio depois, feito por outro integrante em PR próprio.

**Prompt 2: Otimização de performance**
> "merge feito, agora preciso otimizar o projeto, ele está muito lagado"

Aceita: a IA identificou e corrigiu os gargalos de performance introduzidos pela nova tela do Sistema Planetário (cache por planeta, guarda contra respostas fora de ordem, debounce na busca).

**Prompt 3: Reorganização do código por funcionalidade**
> "vamos melhorar a organização do projeto, ao invés de 3 arquivos .js, vamos separar por funcionalidades, deixando a pasta o mais organizada possível."

Aceita: a IA reestruturou `js/api.js`/`js/render.js`/`js/main.js` em `js/core/` (utilitários compartilhados) e `js/features/<view>/{api,view}.js`, sem alterar nenhum comportamento da aplicação.

**Prompt 4: Ampliação da suíte além do mínimo exigido**
> "Conversei com o professor, e podemos fazer mais que 20 casos de teste, e queremos fazer tanto teste de API quanto de interface gráfica"

Aceita: a IA ajustou o plano de testes para cobrir UI e API sem se limitar a 20 casos, resultando nos 53+ casos atuais.

**Prompt 5: Padronização e rastreabilidade dos casos de teste**
> "quantos testes temos no total até agora? e a renomeação deve ser TC-001 [...], de acordo com a descrição."

Aceita: a IA levantou a contagem total e renomeou os cenários Gherkin e requests Newman com o prefixo `TC-XXX —` correspondente à descrição de cada um, criando rastreabilidade direta com o Plano de Testes.

**Prompt 6: Como visualizar os relatórios de execução**
> "me ensine a visualizar o deploy dos resultados nos sites que o cypress e o outro geram"

Aceita: a IA esclareceu que os relatórios são páginas HTML geradas localmente a cada execução (Cypress/mochawesome, Newman/htmlextra, k6-reporter), não um deploy on-line, e explicou como abri-los.

### O que não foi feito por IA

- Definição do escopo e das views do site (Hub, Planetas, Personagens, Filmes, Naves e Veículos, Espécies).
- Decisões de dados e inferências da equipe (regiões/coordenadas do mapa da galáxia, anos da cronologia da saga, vocabulário de tradução pt-BR) — documentadas na seção "Decisões de dados" deste README.
- Distribuição das tarefas entre os integrantes e organização dos Pull Requests.
- Escrita dos casos de teste específicos de cada funcionalidade nova (critério de quais cenários válidos/inválidos importavam para cada tela) e revisão final de todo teste antes do merge.
- Decisão da ferramenta de performance (k6) e da carga usada nos testes, por se tratar de API pública de terceiros.