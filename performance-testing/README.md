# Testes de Performance — Codex Estelar (k6, bônus)

Testes de carga (bônus do enunciado) contra a **SWAPI real**
(`https://swapi.info/api`), com **k6**. Carga deliberadamente modesta —
poucos VUs, execuções curtas — por se tratar de uma API pública de
terceiros (ver seção de Riscos e Limitações do Plano de Testes).

## O que é testado

| ID | Cenário | Executor | Carga | Verifica |
|---|---|---|---|---|
| TC-P01 | `listagem_pessoas` | `constant-vus` | 5 VUs constantes por 30s | `GET /people` → status 200 e lista não vazia |
| TC-P02 | `pico_filmes` | `ramping-vus` | rampa 0→10→0 VUs em 30s (10s subindo, 15s no pico, 5s descendo) | `GET /films` → status 200 e exatamente 6 filmes |

**Thresholds globais** (o run falha se algum for violado):
- 95% das respostas abaixo de 2s (`http_req_duration: p(95)<2000`)
- Menos de 5% de falhas de requisição (`http_req_failed: rate<0.05`)

## Pré-requisitos

- [k6](https://k6.io/) instalado — **não é um pacote npm**, é um binário à parte:
  ```bash
  # Windows (winget ou choco)
  winget install k6 --source winget
  choco install k6

  # macOS
  brew install k6

  # Linux (Debian/Ubuntu)
  sudo gpg -k
  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
  sudo apt-get update && sudo apt-get install k6
  ```
- Verifique com `k6 version`.

## Como executar

```bash
cd performance-testing
k6 run swapi-load.js
```

## Relatório

O script já gera um relatório HTML automaticamente ao final da execução
(via [k6-reporter](https://github.com/benc-uk/k6-reporter)), em
`performance-testing/relatorio/index.html` — abra esse arquivo no
navegador para ver gráficos e a distribuição de tempos de resposta.
Esse relatório é gerado a cada execução e não é versionado (está no
`.gitignore` da raiz do projeto).

## Estrutura

```
performance-testing/
└── swapi-load.js   # cenários TC-P01 e TC-P02, thresholds e handleSummary
```

Sem `package.json`: k6 roda o `.js` diretamente, sem `npm install`. O
único import externo (`k6-reporter`) é resolvido pelo próprio k6 via
URL, na primeira execução.

## Por que uma carga tão modesta?

A SWAPI (`swapi.info`) é mantida pela comunidade como serviço gratuito,
não uma API própria da equipe. Uma carga agressiva poderia sobrecarregar
um serviço de terceiros do qual o próprio site do Codex Estelar depende
para funcionar — por isso os cenários usam poucos VUs e duração curta,
suficiente para demonstrar a técnica sem gerar impacto real no serviço.
