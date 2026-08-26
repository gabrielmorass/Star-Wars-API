# Codex Estelar

Front-end estático (HTML + CSS + JavaScript puro, sem build) conectado à [SWAPI](https://swapi.info) — base do projeto de Qualidade de Software.

## Como rodar

Como o `main.js` usa ES Modules (`import`/`export`), abrir `index.html` direto com duplo-clique (`file://`) pode ser bloqueado pelo navegador. Sirva a pasta com um servidor estático simples:

```bash
# Opção 1 — Python (já vem instalado na maioria dos sistemas)
python3 -m http.server 8080

# Opção 2 — Node
npx serve .
```

Depois acesse `http://localhost:8080`.

## Estrutura

```
index.html        # marcação + navegação (Hub / Sistema planetário / Personagens)
css/style.css      # tokens de design e estilos
js/api.js          # toda comunicação com a SWAPI (fetch)
js/render.js        # funções de renderização de cada view
js/main.js          # roteamento entre views e inicialização
```

## Decisões de dados (importante para o Plano de Testes)

A SWAPI (`https://swapi.info/api`) cobre apenas os Episódios I–VI e tem duas limitações que afetam a aplicação:

1. **Não existe campo `species` no planeta.** A lista de "espécies presentes" em cada planeta é **derivada em tempo real** no `api.js`: buscamos cada morador (`residents`) do planeta e agregamos as espécies encontradas.
2. **Não existe recurso de "eventos".** Usamos a lista de `films` de cada planeta como proxy de "principais acontecimentos" (ex.: "Aparece em: Episódio V — O Império Contra-Ataca").

Esses dois pontos merecem constar explicitamente no Plano de Testes (seção de Riscos e Limitações), já que são inferências da equipe e não dados nativos da API.

## Uso de IA

Este projeto teve apoio de IA (Claude, Anthropic) na geração do código-base do front-end. Conforme item 11 do enunciado, isso deve ser declarado na apresentação e o grupo deve dominar o funcionamento de cada arquivo.
