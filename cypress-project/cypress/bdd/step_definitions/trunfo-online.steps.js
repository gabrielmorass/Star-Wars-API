/**
 * Step Definitions — Super Trunfo, modo online
 * Feature: cypress/bdd/features/trunfo/online.feature
 *
 * O Cypress não dirige dois navegadores, então o outro aparelho é o
 * transporte fake (`?transporte=fake`): um roteiro de mensagens e de
 * presença injetado antes de a página carregar, mais `injetar`/`presenca`
 * para agir no meio do cenário. Nada aqui toca a rede do Supabase.
 *
 * Com `?seed=1977` o anfitrião (este aparelho, j1) usa a mesma semente do
 * TC-095: a primeira carta dele é o Naboo fighter, e a do oponente é o Star
 * Destroyer — o Star Destroyer vence em comprimento, o Naboo fighter em
 * velocidade atmosférica e hiperpropulsor.
 */
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'
import TrunfoPage from '../../pages/TrunfoPage'

/** Mesma versão de protocolo de js/features/trunfo/jogadores.js. */
const V = 1

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

const OPONENTE = { clienteId: 'oponente-fake', entrouEm: 1 }
const NOME_DO_OPONENTE = 'Bia'

/** Roteiros nomeados — o que o "outro aparelho" faz sozinho depois de conectar. */
const ROTEIROS = {
  'oponente que ainda não entrou': [],

  'oponente que entra': [
    { apos: 100, presenca: 'entrar' },
    { apos: 150, mensagem: { tipo: 'ola', v: V, nome: NOME_DO_OPONENTE } },
  ],

  'sala cheia': [
    { apos: 100, presenca: [OPONENTE, { clienteId: 'terceiro', entrouEm: 2 }] },
  ],

  'anfitrião com outro baralho': [
    { apos: 100, presenca: 'entrar' },
    {
      quando: { tipo: 'ola' },
      mensagem: {
        tipo: 'inicio',
        v: V,
        seed: 1977,
        hashBaralho: 'outro-baralho',
        nomes: { j1: NOME_DO_OPONENTE, j2: 'Ana' },
      },
    },
  ],
}

function roteiro(nome) {
  const passos = ROTEIROS[nome]
  if (!passos) throw new Error(`Roteiro desconhecido: "${nome}"`)
  return { oponente: OPONENTE, roteiro: passos }
}

/** "escolher:j1:length, proxima:j2" → [{ tipo, jogador, atributo? }, …] */
function lerAcoes(texto) {
  return texto.split(',').map((parte) => {
    const [tipo, jogador, atributo] = parte.trim().split(':')
    return atributo ? { tipo, jogador, atributo } : { tipo, jogador }
  })
}

/** O `sync` que o outro aparelho mandaria: semente, nomes e hash vêm do `inicio` deste. */
function sincronia(enviadas, acoes) {
  const inicio = enviadas.find((m) => m.tipo === 'inicio')
  expect(inicio, 'mensagem "inicio" enviada por este aparelho').to.exist
  return {
    tipo: 'sync',
    v: V,
    seed: inicio.seed,
    nomes: inicio.nomes,
    hashBaralho: inicio.hashBaralho,
    acoes,
  }
}

let codigoAntesDeRecarregar = null

// =============================================================================
// DADO — Contexto
// =============================================================================

Given('que abro o Super Trunfo online com {string} e o roteiro {string}', (parametros, nome) => {
  TrunfoPage.acessarComOponenteFake(parametros, roteiro(nome))
})

// =============================================================================
// QUANDO — Ações
// =============================================================================

When('informo {string} como meu nome', (nome) => {
  TrunfoPage.informarMeuNome(nome)
})

When('crio uma sala online', () => {
  TrunfoPage.criarSala()
})

When('entro na sala {string}', (codigo) => {
  TrunfoPage.entrarNaSala(codigo)
})

/* Sem esperar a mesa, uma mensagem injetada logo depois de criar a sala
   chegaria antes de a partida existir — e o cenário passaria sem testar nada. */
When('o oponente entra e a partida começa', () => {
  TrunfoPage.esperarPartidaOnline()
})

When('o oponente escolhe {string} como {string} com seq {int}', (atributo, jogador, seq) => {
  TrunfoPage.oponenteEnvia({ tipo: 'acao', v: V, seq, acao: { tipo: 'escolher', jogador, atributo } })
})

When('o oponente passa a rodada como {string} com seq {int}', (jogador, seq) => {
  TrunfoPage.oponenteEnvia({ tipo: 'acao', v: V, seq, acao: { tipo: 'proxima', jogador } })
})

When('o oponente sai da sala', () => {
  TrunfoPage.presencaDoOponente('sair')
})

When('o oponente sincroniza a partida com {string}', (acoes) => {
  TrunfoPage.mensagensEnviadas().then((enviadas) => {
    TrunfoPage.oponenteEnvia(sincronia(enviadas, lerAcoes(acoes)))
  })
})

When('recarrego a página e o oponente responde ao pedido de sincronia', () => {
  TrunfoPage.codigoSala.invoke('text').then((codigo) => {
    codigoAntesDeRecarregar = codigo
  })
  TrunfoPage.mensagensEnviadas().then((enviadas) => {
    /* As jogadas que este aparelho fez antes de recarregar, em ordem. */
    const acoes = enviadas
      .filter((m) => m.tipo === 'acao')
      .sort((a, b) => a.seq - b.seq)
      .map((m) => m.acao)
    TrunfoPage.recarregarComOponenteFake({
      oponente: OPONENTE,
      roteiro: [
        { apos: 100, presenca: 'entrar' },
        { quando: { tipo: 'pedirSync' }, mensagem: sincronia(enviadas, acoes) },
      ],
    })
  })
})

// =============================================================================
// ENTÃO — Verificações
// =============================================================================

Then('o botão do modo online não deve existir', () => {
  TrunfoPage.verificarBotaoOnlineAusente()
})

Then('devo ver um código de sala de 5 caracteres sem 0, O, 1, I e L', () => {
  TrunfoPage.verificarCodigoDaSala(ALFABETO, 5)
})

Then('o status da conexão deve ser {string}', (texto) => {
  TrunfoPage.verificarConexao(texto)
})

Then('devo ver o erro online {string}', (texto) => {
  TrunfoPage.verificarErroOnline(texto)
})

Then('nenhuma partida deve ter começado', () => {
  TrunfoPage.verificarSemPartida()
})

Then('devo ver o aviso {string}', (texto) => {
  TrunfoPage.verificarPausa(texto)
})

Then('os atributos devem estar travados', () => {
  TrunfoPage.verificarAtributosTravados()
})

Then('não deve haver botões de atributo', () => {
  TrunfoPage.verificarSemBotoesDeAtributo()
})

Then('o botão de próxima rodada deve aparecer para mim', () => {
  TrunfoPage.verificarProximaVisivel()
})

Then('devo ver {string} no lugar do botão de próxima rodada', (texto) => {
  TrunfoPage.verificarAguardando(texto)
})

Then('devo ter enviado o início com a semente {int}', (seed) => {
  TrunfoPage.verificarMensagemEnviada({ tipo: 'inicio', v: V, seed })
})

Then('devo ter enviado a escolha de {string} como {string} com seq {int}', (atributo, jogador, seq) => {
  TrunfoPage.verificarMensagemEnviada({
    tipo: 'acao',
    v: V,
    seq,
    acao: { tipo: 'escolher', jogador, atributo },
  })
})

Then('devo ter enviado um pedido de sincronia', () => {
  TrunfoPage.verificarMensagemEnviada({ tipo: 'pedirSync', v: V })
})

Then('não devo ter enviado nenhuma jogada', () => {
  TrunfoPage.verificarNenhumaMensagemDoTipo('acao')
})

Then('a repetição deve ter sido descartada antes de chegar às regras', () => {
  TrunfoPage.verificarNenhumaJogadaRecusadaPelasRegras()
})

Then('o código da sala deve continuar o mesmo', () => {
  TrunfoPage.codigoSala.should(($codigo) => {
    expect($codigo.text()).to.eq(codigoAntesDeRecarregar)
  })
})
