# Testes de Interface — Codex Estelar (Cypress + BDD)

Suíte de testes de interface do **Codex Estelar**, escrita em **Cypress 13**
com **BDD (Gherkin/Cucumber)** e **Page Object Model (POM)** — a mesma
abordagem usada em aula (repositório de referência da disciplina S07,
`cypress-project/`), aqui aplicada ao nosso próprio site em vez de um
site de terceiros.

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- Repositório clonado com o site (`index.html`, `css/`, `js/`) na raiz,
  um nível acima desta pasta

## Instalação

```bash
cd cypress-project
npm install
```

## Como executar

```bash
# Sobe o servidor local e roda a suíte BDD headless, tudo em um comando
npm test

# Alternativa em dois passos, caso o comando acima não funcione no seu
# terminal (ex.: alguns ambientes têm problema com o start-server-and-test):
npm run servidor        # terminal 1 — mantém rodando
npm run test:bdd        # terminal 2

# Modo interativo (abre a interface do Cypress) — precisa do servidor rodando
npm run servidor        # terminal 1
npm run abrir:bdd       # terminal 2
```

## Relatório

Cada execução de `test:bdd` gera um relatório HTML em
`cypress-project/relatorio/index.html` (via `cypress-mochawesome-reporter`).
Abra esse arquivo no navegador para ver o resultado detalhado.

## O que a suíte cobre

São **101 cenários** em 20 arquivos `.feature`, organizados por funcionalidade:

| Feature | Cenários | O que verifica |
|---|---|---|
| `hub/navegacao.feature` | 5 | cada um dos 5 cards leva à view correta (validado pelo título da página) |
| `personagens/busca.feature` | 2 | busca por nome e estado de "nenhum resultado" |
| `personagens/busca-invalida.feature` | 6 | espaços em branco, caixa alta, caracteres especiais, tag HTML, texto de 300 caracteres e limpar a busca |
| `personagens/linha-do-tempo.feature` | 7 | troca de modo, contador, busca no eixo (com e sem resultado), filtro de espécie no eixo, "Ver tudo" e abertura do modal |
| `personagens/ordenacao-e-modal.feature` | 8 | ordenação por altura/nascimento/nome, conexões, fechar (botão e Esc), setas do teclado e atalho para o planeta natal |
| `personagens/filtros.feature` | 6 | filtro por espécie, por filme, combinação dos dois e retorno a "Todos" |
| `filmes/busca.feature` | 2 | busca por título e estado de "nenhum resultado" |
| `filmes/posteres-e-cronologia.feature` | 5 | grade de pôsteres, arte em SVG, ordenação, barra de cronologia e limpar a busca |
| `filmes/modal-abertura.feature` | 10 | texto de abertura no DOM, as quatro abas sob demanda, controles do crawl, fechar e atalho do elenco para Personagens |
| `planetas/busca.feature` | 2 | busca que pula direto para o planeta |
| `planetas/navegacao-por-setas.feature` | 4 | avançar/retroceder no carrossel e o "dar a volta" nas duas pontas (valor limite) |
| `naves-e-veiculos/busca.feature` | 2 | busca por nome |
| `especies/busca-e-detalhe.feature` | 2 | busca por nome e detalhe do planeta natal |
| `trunfo/navegacao.feature` | 2 | o botão da barra de navegação abre o jogo e o Hub continua com 5 cards |
| `trunfo/contra-o-computador.feature` | 6 | distribuição 18 × 18, carta do computador virada, primeira carta com semente fixa, revelação, soma das 36 cartas e atributos escondidos na vez do computador |
| `trunfo/regras-de-rodada.feature` | 6 | atributo desconhecido nos dois lados, hiperpropulsor ao contrário, Death Star contra caça estelar e monte de empate |
| `trunfo/dois-jogadores.feature` | 4 | tela de "passe o aparelho", cartas escondidas atrás dela, visibilidade por vez e nomes digitados |
| `trunfo/partida.feature` | 2 | "Jogar de novo" redistribui 18 × 18 e a partida inteira pelo teclado |
| `trunfo/regras.feature` | 6 | funções puras do jogo, sem abrir o site (ver abaixo) |
| `trunfo/online.feature` | 14 | modo online com o transporte fake: sala, mesma distribuição online e offline, `seq`, repetidas, lacunas e sincronia, baralhos diferentes, sala cheia, desconexão, "Próxima" e recarregar a página (TC-128 é um esquema com 2 exemplos) |

Convenção de nomes: cada arquivo `.feature` leva o nome da **capacidade**
que testa (`busca`, `linha-do-tempo`, `modal-abertura`...), não da view —
a pasta já diz qual view é. Um mesmo view pode ter vários arquivos
(Personagens e Filmes têm 3 cada; o Super Trunfo, 7).

### Três invariantes que vale destacar

**O texto de abertura nunca sai do DOM.** `modal-abertura.feature` verifica que
o `opening_crawl` completo continua dentro de `.film-crawl` em três situações
diferentes: logo ao abrir, com outra aba selecionada e com a animação pausada.
É o tipo de coisa que uma refatoração de animação quebra sem querer.

**A soma da linha do tempo fecha.** Todo personagem com ano conhecido está em
um de três lugares — desenhado no eixo, dobrado num agrupador `+N`, ou atrás do
chip dos que nasceram antes do trecho em foco. `verificarCoerenciaDoContador()`
soma os três e compara com o número anunciado pelo contador. Foi esse cenário
que pegou uma diferença de 3 entre o contador (43) e o que estava desenhado (40).

**O Super Trunfo é testado nos dois níveis.** Cinco features passam pela interface, e
`trunfo/regras.feature` não abre página nenhuma: os step definitions **importam**
`js/features/trunfo/regras.js` (o preprocessor esbuild empacota o módulo junto) e chamam as funções
puras direto — é o mesmo código que roda no navegador, sem cópia e sem mock. São esses cenários que
fixam o que a interface não consegue mostrar: que `aplicarAcao` devolve um estado novo sem alterar o
que recebeu, que o estado sobrevive a um `JSON.stringify`/`parse` sem perder nada, e que a mesma
semente com as mesmas ações reconstrói a partida idêntica (`reproduzir`). É essa garantia que permite
ao modo online reconstruir a mesma partida nos dois aparelhos sem reescrever as regras.

Nos cenários de interface, nada depende de sorte: `?seed=`, `?cpuDelay=0` e `?maos=` (documentados no
README da raiz, seção "Decisões de dados") fixam a distribuição, tiram a espera do computador e forçam
as duas mãos, de modo que cada regra apareça já na primeira rodada.

**O modo online é testado sem rede.** O Cypress não dirige dois navegadores, então
`trunfo/online.feature` roda com `?transporte=fake`: o "outro aparelho" é um roteiro injetado em
`window.__trunfoFake` no `onBeforeLoad` do `cy.visit`, antes de o app carregar. Cada passo do roteiro
dispara uma vez, por tempo (`apos: ms`) ou por gatilho (`quando: { tipo: "acao", seq: 0 }` — quando o
cliente enviar uma mensagem que contenha esses campos), e envia uma `mensagem` ou muda a `presenca`
(`"entrar"`, `"sair"` ou a lista exata). Tudo o que o cliente envia fica em `__trunfoFake.enviadas`, e
`injetar(mensagem)` / `presenca(acao)` deixam o passo agir no meio do cenário. O objeto só é lido
com `?transporte=fake` na URL. Nenhum teste toca o Supabase — e não há teste de carga contra ele: é
o plano gratuito de um terceiro.

**O carrossel de planetas nunca trava numa ponta.** `navegacao-por-setas.feature`
cobre o caso de valor limite do índice: `index = (newIndex + planets.length) %
planets.length` em `js/features/planets/view.js` faz a seta "anterior" dar a
volta do primeiro para o último planeta, e a seta "próxima" do último de volta
para o primeiro, em vez de travar ou lançar um índice inválido. TC-054 e
TC-055 fixam exatamente essas duas pontas.

## Teste manual — modo online

O Supabase de verdade não roda no CI. Com `SUPABASE_URL` e `SUPABASE_ANON_KEY` preenchidos em
`js/config.js`, confira em **dois aparelhos reais** (ex.: celular e notebook):

- [ ] **Criar e entrar:** no aparelho A, "Online (dois aparelhos)" → "Criar sala"; no B, digitar o
      código (em minúsculas e com espaço no meio também tem que funcionar) → "Entrar na sala". Os dois
      veem 18 × 18, a própria carta aberta e a do outro virada, e o status "Conectado".
- [ ] **Algumas rodadas:** jogar 3 ou 4 rodadas. Só o vencedor de cada rodada vê "Próxima rodada"; o
      outro vê "Aguardando {nome}…". Placar e monte de empate iguais nos dois aparelhos.
- [ ] **Wi-Fi caindo:** desligar o Wi-Fi de B no meio de uma rodada. Em alguns segundos (o tempo
      de o Realtime notar a queda), A mostra "{nome} desconectou. Aguardando reconexão…" e trava os
      atributos; depois de 60 s aparece "Encerrar partida". Religar antes disso: o jogo continua de
      onde parou, com o mesmo placar.
- [ ] **Recarregar:** recarregar a página em A no meio da partida. A volta direto para o Super Trunfo,
      na mesma sala e como o mesmo jogador, com o mesmo placar.
- [ ] **Terceiro aparelho:** abrir o mesmo código num terceiro aparelho (ou aba). Ele vê "Esta sala já
      está cheia." e a partida dos outros dois não é afetada.
- [ ] **Sair:** "Sair da partida" volta à tela inicial; recarregar depois disso não reentra na sala.
- [ ] **Versão rápida, sem Supabase:** abrir `/?transporte=aba` em **duas abas** do mesmo navegador,
      criar a sala numa e entrar com o código na outra. Fechar uma das abas pausa a outra.

## Estrutura

```
cypress-project/
├── cypress.bdd.config.js       # config do Cypress (baseUrl, reporter, plugin do Cucumber)
├── cypress/
│   ├── bdd/
│   │   ├── features/<funcionalidade>/*.feature   # cenários em Gherkin (pt-BR)
│   │   └── step_definitions/                     # implementação dos passos
│   ├── pages/           # Page Objects — um por view do site
│   ├── fixtures/        # dados de teste centralizados
│   └── support/         # comandos customizados e configuração global
└── package.json
```

## Convenções

- Cenários em Gherkin: `# language: pt` no topo de cada `.feature`, com
  `Funcionalidade` / `Contexto` / `Cenário` / `Dado` / `Quando` / `Então`.
- Um step "Dado que acesso a página de X" por funcionalidade, centralizado
  em `compartilhado.steps.js`.
- Seletores CSS só existem dentro dos Page Objects (`cypress/pages/`) —
  step definitions e specs nunca usam `cy.get()` com um seletor cru.
- Os testes rodam contra a **SWAPI real**, sem mock. Por isso as asserções
  evitam depender de contagens que a API pode mudar: onde o número importa,
  ele é lido da própria tela e comparado com outra parte da tela (ver
  `verificarCoerenciaDoContador`), em vez de ficar fixo no teste.
- Nada de `cy.wait(<número>)` para "esperar carregar": a espera é sempre por
  uma condição (`should`), que o Cypress reexecuta até passar ou estourar o
  timeout. É o que mantém a suíte estável.
