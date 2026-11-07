/**
 * Step Definitions — Super Trunfo (regras puras)
 * Feature: cypress/bdd/features/trunfo/regras.feature
 *
 * Estes cenários NÃO abrem o site: eles importam `js/features/trunfo/regras.js`
 * direto e exercitam as funções puras. O preprocessor esbuild do Cypress
 * empacota o módulo junto com o step file, então o mesmo código que roda no
 * navegador roda aqui — sem cópia e sem mock.
 *
 * O baralho de teste abaixo é um recorte de seis naves com os valores EXATOS
 * que a SWAPI devolve (faixa "30-165", unidade colada "1000km", milhar
 * "1,600", `n/a` e `unknown`). Ele existe para o teste não depender da rede.
 */
import { Given, Then } from '@badeball/cypress-cucumber-preprocessor'
import {
  aplicarAcao,
  criarPartida,
  escolhaCpu,
  montarBaralho,
  paraNumero,
  reproduzir,
} from '../../../../js/features/trunfo/regras.js'

const NAVES_DE_TESTE = [
  {
    name: 'CR90 corvette',
    starship_class: 'corvette',
    length: '150',
    crew: '30-165',
    max_atmosphering_speed: '950',
    cost_in_credits: '3500000',
    hyperdrive_rating: '2.0',
    url: 'https://swapi.info/api/starships/2',
  },
  {
    name: 'Death Star',
    starship_class: 'Deep Space Mobile Battlestation',
    length: '120000',
    crew: '342,953',
    max_atmosphering_speed: 'n/a',
    cost_in_credits: '1000000000000',
    hyperdrive_rating: '4.0',
    url: 'https://swapi.info/api/starships/9',
  },
  {
    name: 'Millennium Falcon',
    starship_class: 'Light freighter',
    length: '34.37',
    crew: '4',
    max_atmosphering_speed: '1050',
    cost_in_credits: '100000',
    hyperdrive_rating: '0.5',
    url: 'https://swapi.info/api/starships/10',
  },
  {
    name: 'Y-wing',
    starship_class: 'assault starfighter',
    length: '14',
    crew: '2',
    max_atmosphering_speed: '1000km',
    cost_in_credits: '134999',
    hyperdrive_rating: '1.0',
    url: 'https://swapi.info/api/starships/11',
  },
  {
    name: 'TIE Advanced x1',
    starship_class: 'Starfighter',
    length: '9.2',
    crew: '1',
    max_atmosphering_speed: '1200',
    cost_in_credits: 'unknown',
    hyperdrive_rating: '1.0',
    url: 'https://swapi.info/api/starships/13',
  },
  {
    name: 'Star Destroyer',
    starship_class: 'Star Destroyer',
    length: '1,600',
    crew: '47,060',
    max_atmosphering_speed: '975',
    cost_in_credits: '150000000',
    hyperdrive_rating: '2.0',
    url: 'https://swapi.info/api/starships/3',
  },
]

function configuracao() {
  return {
    baralho: montarBaralho(NAVES_DE_TESTE),
    seed: 1977,
    modo: 'cpu',
    nomes: { j1: 'Jogador 1', j2: 'Computador' },
    maos: { j1: [10, 11, 13], j2: [2, 3, 9] },
  }
}

/** Joga do começo ao fim usando a escolha (pura) do computador dos dois lados. */
function partidaCompleta() {
  const config = configuracao()
  const acoes = []
  let estado = criarPartida(config)

  while (estado.fase !== 'fim') {
    const acao =
      estado.fase === 'escolhendo'
        ? { tipo: 'escolher', jogador: estado.vez, atributo: escolhaCpu(estado, estado.vez) }
        : { tipo: 'proxima', jogador: estado.vez }
    acoes.push(acao)
    estado = aplicarAcao(estado, acao)
  }

  return { config, acoes, estado }
}

let partida = null

// =============================================================================
// DADO — Contexto
// =============================================================================

Given('que uso as regras puras do Super Trunfo', () => {
  partida = null
})

Given('que jogo uma partida completa com as regras puras', () => {
  partida = partidaCompleta()
  expect(partida.estado.fase).to.eq('fim')
})

// =============================================================================
// ENTÃO — Verificações
// =============================================================================

Then('o texto {string} deve virar o número {float}', (texto, esperado) => {
  expect(paraNumero(texto)).to.eq(esperado)
})

Then('o texto {string} deve virar um valor desconhecido', (texto) => {
  expect(paraNumero(texto)).to.eq(null)
})

Then('reproduzir as mesmas ações deve devolver o mesmo estado', () => {
  expect(reproduzir(partida.config, partida.acoes)).to.deep.equal(partida.estado)
  /* E o histórico guardado no estado é exatamente a lista de ações. */
  expect(partida.estado.historico).to.deep.equal(partida.acoes)
})

Then('jogar outra vez com a mesma semente deve dar o mesmo estado', () => {
  expect(partidaCompleta().estado).to.deep.equal(partida.estado)
})

Then('o estado deve sobreviver a uma ida e volta por JSON', () => {
  expect(JSON.parse(JSON.stringify(partida.estado))).to.deep.equal(partida.estado)
})

Then('o estado inicial deve sobreviver a uma ida e volta por JSON', () => {
  const inicial = criarPartida(configuracao())
  expect(JSON.parse(JSON.stringify(inicial))).to.deep.equal(inicial)
})

Then('aplicar uma ação não deve alterar o estado recebido', () => {
  const inicial = criarPartida(configuracao())
  const antes = JSON.stringify(inicial)
  const depois = aplicarAcao(inicial, {
    tipo: 'escolher',
    jogador: 'j1',
    atributo: 'hyperdrive_rating',
  })

  expect(JSON.stringify(inicial)).to.eq(antes)
  expect(depois).to.not.equal(inicial)
  expect(depois.fase).to.eq('revelado')
})

Then('uma ação do jogador errado deve ser recusada', () => {
  const inicial = criarPartida(configuracao())
  expect(() =>
    aplicarAcao(inicial, { tipo: 'escolher', jogador: 'j2', atributo: 'crew' })
  ).to.throw('Não é a vez de j2')
})

Then('escolher um atributo desconhecido na própria carta deve ser recusado', () => {
  /* TIE Advanced x1 (id 13) não tem custo na SWAPI: no topo da mão de j1,
     esse atributo não pode ser escolhido. */
  const config = configuracao()
  const inicial = criarPartida({ ...config, maos: { j1: [13, 11], j2: [2, 3] } })
  expect(() =>
    aplicarAcao(inicial, { tipo: 'escolher', jogador: 'j1', atributo: 'cost_in_credits' })
  ).to.throw('é desconhecido em TIE Advanced x1')
})

Then('uma ação de tipo desconhecido deve ser recusada', () => {
  const inicial = criarPartida(configuracao())
  expect(() => aplicarAcao(inicial, { tipo: 'trapacear', jogador: 'j1' })).to.throw(
    'Tipo de ação desconhecido'
  )
})

/* Millennium Falcon (10, 34,37 m) contra CR90 corvette (2, 150 m): j1 escolhe
   comprimento e perde. */
function rodadaPerdidaPorJ1() {
  return aplicarAcao(criarPartida(configuracao()), {
    tipo: 'escolher',
    jogador: 'j1',
    atributo: 'length',
  })
}

Then('quem escolheu e perdeu ainda pode passar a rodada', () => {
  const depois = aplicarAcao(rodadaPerdidaPorJ1(), { tipo: 'proxima', jogador: 'j1' })
  expect(depois.vez).to.eq('j2')
  expect(depois.jogadores.j2.mao).to.have.length(4)
})

Then('o vencedor da rodada também pode passá-la, e escolhe a seguinte', () => {
  const revelado = rodadaPerdidaPorJ1()
  const depois = aplicarAcao(revelado, { tipo: 'proxima', jogador: 'j2' })
  expect(depois.vez).to.eq('j2')
  expect(depois.jogadores.j2.mao).to.have.length(4)
  /* Mesma partida, passada por quem escolheu: o estado só difere no histórico. */
  const pelaOutraMao = aplicarAcao(revelado, { tipo: 'proxima', jogador: 'j1' })
  expect({ ...depois, historico: [] }).to.deep.equal({ ...pelaOutraMao, historico: [] })
})

Then('depois de um empate, só quem escolheu pode passar a rodada', () => {
  /* Y-wing (11) e TIE Advanced x1 (13): os dois têm hiperpropulsor 1.0. */
  const config = configuracao()
  const empate = aplicarAcao(criarPartida({ ...config, maos: { j1: [11, 10], j2: [13, 2] } }), {
    tipo: 'escolher',
    jogador: 'j1',
    atributo: 'hyperdrive_rating',
  })
  expect(empate.ultimaRodada.vencedor).to.eq(null)
  expect(() => aplicarAcao(empate, { tipo: 'proxima', jogador: 'j2' })).to.throw(
    'Não é j2 quem passa a rodada'
  )
  expect(aplicarAcao(empate, { tipo: 'proxima', jogador: 'j1' }).empate).to.have.length(2)
})
