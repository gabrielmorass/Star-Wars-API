/* Super Trunfo — regras do jogo.
   ------------------------------------------------------------------
   Este módulo é PURO: nada de DOM, fetch, timer, Math.random ou Date.
   Toda a partida é uma máquina de estados serializável — o estado é JSON
   puro e `aplicarAcao` devolve um estado NOVO, sem nunca tocar no que
   recebeu. É isso que faz o computador, o segundo jogador no mesmo
   aparelho e o jogador remoto serem apenas fontes diferentes das MESMAS
   duas ações.

   A única fonte de aleatoriedade do jogo é `embaralhar(baralho, seed)`,
   com um PRNG semeado (mulberry32). Quem lê a semente é a view; aqui ela
   entra sempre como argumento.

   As regras de disputa (o que vence, o que é desconhecido, o Super Trunfo)
   são DECISÕES DA EQUIPE, não dado da SWAPI — ver "Decisões de dados" no
   README da raiz. */

import { VAZIO, classeDeNave } from "../../core/vocabulario.js";

/** Versão do formato do estado, comparada pelos dois aparelhos no modo online. */
export const VERSAO = 1;

/** Cartas na mão de cada jogador no início (36 naves / 2). */
export const MAO_INICIAL = 18;

/** Teto de rodadas: sem ele, duas mãos equilibradas giram para sempre. */
export const LIMITE_RODADAS = 40;

/* Os 5 atributos disputados, na ordem em que aparecem na carta.
   `vence: "menor"` só existe no hiperpropulsor: classe 0.5 é mais rápida
   que classe 4.0, então ali o menor valor ganha. */
export const ATRIBUTOS = [
  { chave: "length", rotulo: "Comprimento (m)", vence: "maior" },
  { chave: "crew", rotulo: "Tripulação", vence: "maior" },
  { chave: "max_atmosphering_speed", rotulo: "Velocidade atmosférica (km/h)", vence: "maior" },
  { chave: "cost_in_credits", rotulo: "Custo (créditos)", vence: "maior" },
  { chave: "hyperdrive_rating", rotulo: "Hiperpropulsor (classe)", vence: "menor" },
];

const POR_CHAVE = Object.fromEntries(ATRIBUTOS.map((a) => [a.chave, a]));

/** O atributo existe na tabela? */
export function atributoValido(chave) {
  return Object.prototype.hasOwnProperty.call(POR_CHAVE, chave);
}

export function rotuloDe(chave) {
  return POR_CHAVE[chave] ? POR_CHAVE[chave].rotulo : chave;
}

/**
 * Número utilizável a partir do texto que a SWAPI devolve.
 *
 *   "1,600"   → 1600     (separador de milhar)
 *   "10.4 "   → 10.4     (espaços em volta)
 *   "1000km"  → 1000     (unidade colada)
 *   "30-165"  → 165      (faixa: fica o MAIOR número)
 *   "unknown" → null     (e "n/a", "none", "" — o conjunto VAZIO)
 *
 * A vírgula é sempre separador de milhar na base (a SWAPI escreve decimal
 * com ponto), então ela simplesmente sai antes da leitura.
 */
export function paraNumero(texto) {
  if (texto === undefined || texto === null) return null;
  const bruto = String(texto).trim();
  if (VAZIO.has(bruto.toLowerCase())) return null;

  const numeros = bruto.replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
  if (!numeros) return null;

  return numeros.reduce((maior, n) => Math.max(maior, Number(n)), -Infinity);
}

/** Id numérico do fim da url ("…/starships/9" → 9). */
function idDaUrl(url) {
  const m = String(url || "").match(/(\d+)\/?$/);
  return m ? Number(m[1]) : null;
}

/** A classe é um caça estelar? É o que anula o Super Trunfo. */
export function ehCacaEstelar(starshipClass) {
  return String(starshipClass || "").toLowerCase().includes("starfighter");
}

/**
 * Naves da SWAPI → baralho de cartas simples (JSON puro), ordenado pelo id
 * numérico da url. Ordenar por id antes de embaralhar é o que faz a ordem
 * do baralho NÃO depender da ordem em que a API respondeu.
 */
export function montarBaralho(starships) {
  return (starships || [])
    .map((nave) => ({
      id: idDaUrl(nave.url),
      name: nave.name,
      starship_class: nave.starship_class || "",
      valores: Object.fromEntries(
        ATRIBUTOS.map((a) => [a.chave, paraNumero(nave[a.chave])])
      ),
      superTrunfo: nave.name === "Death Star",
      cacaEstelar: ehCacaEstelar(nave.starship_class),
    }))
    .filter((carta) => carta.id !== null)
    .sort((a, b) => a.id - b.id);
}

/**
 * Impressão digital curta e estável do conteúdo que afeta as partidas.
 * A fase online usa isto para conferir se os dois aparelhos podem aplicar
 * as mesmas regras às mesmas cartas. Nomes e valores importam tanto quanto
 * os ids: a SWAPI pode mudar sem trocar a URL de uma nave.
 *
 * Duas passagens FNV-1a de 32 bits formam uma impressão digital de 64 bits,
 * serializada em base 36. Não é uma assinatura de segurança: detecta diferenças
 * acidentais nos dados carregados pelos dois aparelhos.
 * A ordenação e a ordem explícita dos atributos tornam o resultado
 * independente da ordem de resposta da API ou das propriedades dos objetos.
 */
export function hashBaralho(baralho) {
  const cartas = (baralho || [])
    .map((carta) => ({
      id: carta.id,
      name: carta.name,
      starship_class: carta.starship_class,
      valores: ATRIBUTOS.map(({ chave }) => carta.valores[chave]),
      superTrunfo: carta.superTrunfo,
      cacaEstelar: carta.cacaEstelar,
    }))
    .sort((a, b) => a.id - b.id);
  const texto = JSON.stringify(cartas);

  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < texto.length; i++) {
    const codigo = texto.charCodeAt(i);
    h1 ^= codigo;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= codigo ^ (i & 0xff);
    h2 = Math.imul(h2, 0x01000193) >>> 0;
  }
  return `${h1.toString(36).padStart(7, "0")}${h2.toString(36).padStart(7, "0")}`;
}

/** PRNG semeado (mulberry32): mesma semente, mesma sequência, em qualquer navegador. */
export function prng(semente) {
  let a = semente >>> 0;
  return function proximo() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates com o PRNG semeado. Não altera o baralho recebido. */
export function embaralhar(baralho, seed) {
  const sorteio = prng(seed);
  const copia = baralho.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(sorteio() * (i + 1));
    const troca = copia[i];
    copia[i] = copia[j];
    copia[j] = troca;
  }
  return copia;
}

const NOMES_PADRAO = {
  cpu: { j1: "Jogador 1", j2: "Computador" },
  local: { j1: "Jogador 1", j2: "Jogador 2" },
};

/** O outro jogador. */
export function adversario(jogador) {
  return jogador === "j1" ? "j2" : "j1";
}

/** Carta que está em jogo na mão do jogador (o topo). */
export function cartaDeTopo(estado, jogador) {
  const id = estado.jogadores[jogador].mao[0];
  return id === undefined ? null : estado.cartas[id];
}

/**
 * Estado inicial da partida.
 *
 * @param {object}   cfg
 * @param {object[]} cfg.baralho  saída de montarBaralho()
 * @param {number}   cfg.seed     semente do embaralhamento
 * @param {string}   cfg.modo     "cpu" | "local"
 * @param {object}   [cfg.nomes]  { j1, j2 }
 * @param {object}   [cfg.maos]   { j1: [ids], j2: [ids] } — força as mãos
 *                                (só para teste/depuração, via ?maos=)
 */
export function criarPartida({ baralho, seed, modo, nomes, maos = null }) {
  if (!Array.isArray(baralho) || baralho.length === 0) {
    throw new Error("Baralho vazio: não há naves para montar a partida.");
  }
  if (modo !== "cpu" && modo !== "local") {
    throw new Error(`Modo desconhecido: "${modo}". Use "cpu" ou "local".`);
  }

  const cartas = {};
  baralho.forEach((carta) => {
    if (!carta || typeof carta !== "object") {
      throw new Error("Baralho inválido: foi recebida uma carta malformada.");
    }
    if (!Number.isSafeInteger(carta.id) || carta.id < 0) {
      throw new Error("Baralho inválido: toda carta precisa de um id numérico válido.");
    }
    if (Object.prototype.hasOwnProperty.call(cartas, carta.id)) {
      throw new Error(`Baralho inválido: a carta ${carta.id} aparece mais de uma vez.`);
    }
    if (!carta.valores || typeof carta.valores !== "object") {
      throw new Error(`Baralho inválido: ${carta.name || "uma nave"} não tem atributos.`);
    }
    for (const { chave } of ATRIBUTOS) {
      const valor = carta.valores[chave];
      if (valor !== null && (!Number.isFinite(valor) || valor < 0)) {
        throw new Error(`Baralho inválido: ${chave} de ${carta.name || "uma nave"} não é um número válido.`);
      }
    }
    if (ATRIBUTOS.every(({ chave }) => carta.valores[chave] === null)) {
      throw new Error(`Baralho inválido: ${carta.name || "uma nave"} não tem atributos conhecidos.`);
    }
    cartas[carta.id] = carta;
  });

  let maoJ1;
  let maoJ2;
  if (maos) {
    if (!Array.isArray(maos.j1) || !Array.isArray(maos.j2)) {
      throw new Error("Mãos forçadas: informe uma lista de cartas para cada jogador.");
    }
    maoJ1 = (maos.j1 || []).map(Number);
    maoJ2 = (maos.j2 || []).map(Number);
    const desconhecido = [...maoJ1, ...maoJ2].find((id) => !cartas[id]);
    if (desconhecido !== undefined) {
      throw new Error(`Carta ${desconhecido} não existe no baralho.`);
    }
    if (maoJ1.length === 0 || maoJ2.length === 0) {
      throw new Error("Mãos forçadas: cada jogador precisa de ao menos uma carta.");
    }
    if (new Set([...maoJ1, ...maoJ2]).size !== maoJ1.length + maoJ2.length) {
      throw new Error("Mãos forçadas: cada carta pode aparecer apenas uma vez.");
    }
  } else {
    const embaralhado = embaralhar(baralho, seed);
    maoJ1 = embaralhado.slice(0, MAO_INICIAL).map((c) => c.id);
    maoJ2 = embaralhado.slice(MAO_INICIAL, MAO_INICIAL * 2).map((c) => c.id);
  }

  const padrao = NOMES_PADRAO[modo];
  return {
    versao: VERSAO,
    seed,
    hashBaralho: hashBaralho(baralho),
    modo,
    cartas,
    total: maoJ1.length + maoJ2.length,
    jogadores: {
      j1: { nome: (nomes && nomes.j1) || padrao.j1, mao: maoJ1 },
      j2: { nome: (nomes && nomes.j2) || padrao.j2, mao: maoJ2 },
    },
    empate: [],
    rodada: 1,
    vez: "j1",
    fase: "escolhendo",
    ultimaRodada: null,
    historico: [],
    vencedor: null,
    motivoFim: null,
  };
}

/* ---------------- disputa de uma rodada ---------------- */

/**
 * Quem vence a rodada, e por quê. Função pura sobre duas cartas.
 * O Super Trunfo decide ANTES do atributo: quando a Death Star está em
 * jogo, o atributo escolhido não muda o resultado.
 */
function resolver(cartaEscolhedor, cartaOutro, escolhedor, atributo) {
  const outro = adversario(escolhedor);

  /* Super Trunfo: a Death Star vence tudo, menos um caça estelar —
     foi um caça que a destruiu. */
  const superDoEscolhedor = cartaEscolhedor.superTrunfo;
  const superDoOutro = cartaOutro.superTrunfo;
  if (superDoEscolhedor || superDoOutro) {
    const dona = superDoEscolhedor ? escolhedor : outro;
    const rival = superDoEscolhedor ? cartaOutro : cartaEscolhedor;
    const naveSuper = superDoEscolhedor ? cartaEscolhedor : cartaOutro;

    if (rival.cacaEstelar) {
      return {
        vencedor: adversario(dona),
        motivoCodigo: "caca-estelar",
        motivo: `${rival.name} é um caça estelar (${classeDeNave(rival.starship_class)}) e derruba o Super Trunfo: foi um caça que destruiu a ${naveSuper.name}.`,
      };
    }
    return {
      vencedor: dona,
      motivoCodigo: "super-trunfo",
      motivo: `${naveSuper.name} é o Super Trunfo do baralho e vence qualquer carta que não seja um caça estelar.`,
    };
  }

  const regra = POR_CHAVE[atributo];
  const meu = cartaEscolhedor.valores[atributo];
  const seu = cartaOutro.valores[atributo];

  /* Atributo desconhecido na carta do adversário: quem escolheu leva. */
  if (seu === null) {
    return {
      vencedor: escolhedor,
      motivoCodigo: "desconhecido",
      motivo: `${regra.rotulo} é desconhecido em ${cartaOutro.name}, então ${cartaEscolhedor.name} vence a rodada.`,
    };
  }

  if (meu === seu) {
    return {
      vencedor: null,
      motivoCodigo: "empate",
      motivo: `Empate em ${regra.rotulo}: as duas naves marcam ${formatarValor(meu, atributo)}.`,
    };
  }

  const escolhedorGanha = regra.vence === "maior" ? meu > seu : meu < seu;
  const vencedor = escolhedorGanha ? escolhedor : outro;
  const cartaVitoriosa = escolhedorGanha ? cartaEscolhedor : cartaOutro;
  const cartaPerdedora = escolhedorGanha ? cartaOutro : cartaEscolhedor;
  const valorVitorioso = escolhedorGanha ? meu : seu;
  const valorPerdedor = escolhedorGanha ? seu : meu;

  return {
    vencedor,
    motivoCodigo: regra.vence,
    motivo:
      regra.vence === "maior"
        ? `${cartaVitoriosa.name} vence em ${regra.rotulo}: ${formatarValor(valorVitorioso, atributo)} contra ${formatarValor(valorPerdedor, atributo)}.`
        : `${cartaVitoriosa.name} vence em ${regra.rotulo}: classe ${formatarValor(valorVitorioso, atributo)} é mais rápida que classe ${formatarValor(valorPerdedor, atributo)}.`,
  };
}

/** Valor numérico em pt-BR. O hiperpropulsor mantém a casa decimal ("1,0"). */
export function formatarValor(valor, atributo) {
  if (valor === null || valor === undefined) return "Desconhecido";
  if (atributo === "hyperdrive_rating") {
    return valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/* ---------------- ações ---------------- */

/**
 * Quem escolhe o atributo da próxima rodada: na fase "revelado", o vencedor
 * da rodada (ou o mesmo escolhedor, depois de um empate); fora dela, quem
 * já está na vez.
 */
export function proximoAEscolher(estado) {
  if (estado.fase === "revelado" && estado.ultimaRodada && estado.ultimaRodada.vencedor) {
    return estado.ultimaRodada.vencedor;
  }
  return estado.vez;
}

/** As ações permitidas agora, na forma exata em que devem ser despachadas. */
export function acoesValidas(estado) {
  if (estado.fase === "fim") return [];

  if (estado.fase === "revelado") {
    const quemEscolhe = proximoAEscolher(estado);
    const acoes = [{ tipo: "proxima", jogador: estado.vez }];
    if (quemEscolhe !== estado.vez) acoes.push({ tipo: "proxima", jogador: quemEscolhe });
    return acoes;
  }

  const carta = cartaDeTopo(estado, estado.vez);
  if (!carta) return [];
  return ATRIBUTOS.filter((a) => carta.valores[a.chave] !== null).map((a) => ({
    tipo: "escolher",
    jogador: estado.vez,
    atributo: a.chave,
  }));
}

/** Cópia rasa do estado. `cartas` é só leitura, por isso a referência é compartilhada. */
function clonar(estado) {
  return {
    ...estado,
    jogadores: {
      j1: { ...estado.jogadores.j1, mao: estado.jogadores.j1.mao.slice() },
      j2: { ...estado.jogadores.j2, mao: estado.jogadores.j2.mao.slice() },
    },
    empate: estado.empate.slice(),
    historico: estado.historico.slice(),
  };
}

function validarJogador(jogador) {
  if (jogador !== "j1" && jogador !== "j2") {
    throw new Error(`Jogador inválido: "${jogador}". Use "j1" ou "j2".`);
  }
}

/**
 * Aplica uma ação e devolve um estado NOVO. Nunca altera o recebido.
 * Ação inválida lança erro com a explicação — é o único jeito de uma fonte
 * de ação (humano, computador, remoto) descobrir que errou.
 */
export function aplicarAcao(estado, acao) {
  if (!acao || typeof acao !== "object") {
    throw new Error("Ação ausente ou malformada.");
  }
  if (estado.fase === "fim") {
    throw new Error("A partida terminou: nenhuma ação é aceita.");
  }

  if (acao.tipo === "escolher") return escolher(estado, acao);
  if (acao.tipo === "proxima") return proxima(estado, acao);
  throw new Error(`Tipo de ação desconhecido: "${acao.tipo}".`);
}

function escolher(estado, acao) {
  validarJogador(acao.jogador);
  if (estado.fase !== "escolhendo") {
    throw new Error(`"escolher" só vale na fase "escolhendo" (fase atual: "${estado.fase}").`);
  }
  if (acao.jogador !== estado.vez) {
    throw new Error(`Não é a vez de ${acao.jogador}: quem escolhe é ${estado.vez}.`);
  }
  if (!atributoValido(acao.atributo)) {
    throw new Error(`Atributo desconhecido: "${acao.atributo}".`);
  }

  const minhaCarta = cartaDeTopo(estado, acao.jogador);
  const outraCarta = cartaDeTopo(estado, adversario(acao.jogador));
  if (!minhaCarta || !outraCarta) {
    throw new Error("Um dos jogadores está sem cartas: a partida deveria ter terminado.");
  }
  if (minhaCarta.valores[acao.atributo] === null) {
    throw new Error(
      `${rotuloDe(acao.atributo)} é desconhecido em ${minhaCarta.name}: não pode ser escolhido.`
    );
  }

  const disputa = resolver(minhaCarta, outraCarta, acao.jogador, acao.atributo);
  const novo = clonar(estado);
  novo.fase = "revelado";
  novo.ultimaRodada = {
    rodada: estado.rodada,
    escolheu: acao.jogador,
    atributo: acao.atributo,
    cartas: { j1: estado.jogadores.j1.mao[0], j2: estado.jogadores.j2.mao[0] },
    valores: {
      j1: estado.cartas[estado.jogadores.j1.mao[0]].valores[acao.atributo],
      j2: estado.cartas[estado.jogadores.j2.mao[0]].valores[acao.atributo],
    },
    vencedor: disputa.vencedor,
    motivo: disputa.motivo,
    motivoCodigo: disputa.motivoCodigo,
  };
  novo.historico.push({ tipo: "escolher", jogador: acao.jogador, atributo: acao.atributo });
  return novo;
}

function proxima(estado, acao) {
  validarJogador(acao.jogador);
  if (estado.fase !== "revelado") {
    throw new Error(`"proxima" só vale na fase "revelado" (fase atual: "${estado.fase}").`);
  }
  /* Passa a rodada quem escolheu nela OU quem vai escolher a seguinte (o
     vencedor). No mesmo aparelho e contra o computador, quem escolheu é
     quem passa; no modo online, quem passa é o vencedor, porque é ele que
     joga em seguida — essa restrição mora na camada online, não aqui. */
  const quemEscolhe = proximoAEscolher(estado);
  if (acao.jogador !== estado.vez && acao.jogador !== quemEscolhe) {
    throw new Error(
      quemEscolhe === estado.vez
        ? `Não é ${acao.jogador} quem passa a rodada: a vez é de ${estado.vez}.`
        : `Não é ${acao.jogador} quem passa a rodada: passa ${estado.vez}, que escolheu, ou ${quemEscolhe}, que escolhe a seguir.`
    );
  }

  const novo = clonar(estado);
  const { vencedor } = estado.ultimaRodada;
  const cartaJ1 = estado.jogadores.j1.mao[0];
  const cartaJ2 = estado.jogadores.j2.mao[0];

  novo.jogadores.j1.mao = novo.jogadores.j1.mao.slice(1);
  novo.jogadores.j2.mao = novo.jogadores.j2.mao.slice(1);

  if (vencedor === null) {
    /* Empate: as duas cartas vão para o monte, e quem ganhar a próxima
       rodada decidida leva o monte inteiro. Quem escolheu continua
       escolhendo — ninguém venceu para tomar a vez. */
    novo.empate.push(cartaJ1, cartaJ2);
  } else {
    /* O vencedor põe as duas no fim da própria mão, a dele primeiro,
       e ainda recolhe o monte de empate. */
    const minha = vencedor === "j1" ? cartaJ1 : cartaJ2;
    const dele = vencedor === "j1" ? cartaJ2 : cartaJ1;
    novo.jogadores[vencedor].mao.push(minha, dele, ...novo.empate);
    novo.empate = [];
    novo.vez = vencedor;
  }

  novo.rodada = estado.rodada + 1;
  novo.fase = "escolhendo";
  novo.historico.push({ tipo: "proxima", jogador: acao.jogador });

  return encerrarSePreciso(novo);
}

/** Fim por mão vazia ou por teto de rodadas. */
function encerrarSePreciso(estado) {
  const n1 = estado.jogadores.j1.mao.length;
  const n2 = estado.jogadores.j2.mao.length;

  if (n1 === 0 && n2 === 0) {
    estado.fase = "fim";
    estado.vencedor = null;
    estado.motivoFim = "As duas últimas cartas empataram e foram para o monte: a partida termina empatada.";
    return estado;
  }
  if (n1 === 0 || n2 === 0) {
    const ganhou = n1 === 0 ? "j2" : "j1";
    estado.fase = "fim";
    estado.vencedor = ganhou;
    estado.motivoFim = `${estado.jogadores[ganhou].nome} ficou com as ${estado.total} cartas do baralho.`;
    return estado;
  }
  if (estado.rodada > LIMITE_RODADAS) {
    estado.fase = "fim";
    if (n1 === n2) {
      estado.vencedor = null;
      estado.motivoFim = `Limite de ${LIMITE_RODADAS} rodadas: empate, ${n1} cartas para cada um.`;
    } else {
      const ganhou = n1 > n2 ? "j1" : "j2";
      estado.vencedor = ganhou;
      estado.motivoFim = `Limite de ${LIMITE_RODADAS} rodadas: ${estado.jogadores[ganhou].nome} termina com mais cartas (${Math.max(n1, n2)} a ${Math.min(n1, n2)}) e vence.`;
    }
  }
  return estado;
}

/**
 * Estado obtido aplicando as ações em ordem a partir da configuração.
 * O modo online usa isto para reconstruir a partida numa reconexão: mesma
 * configuração + mesmo histórico = mesmo estado, bit a bit.
 */
export function reproduzir(config, acoes) {
  return (acoes || []).reduce((estado, acao) => aplicarAcao(estado, acao), criarPartida(config));
}

/**
 * Escolha do computador: entre os atributos CONHECIDOS na carta dele, o em
 * que a carta se posiciona melhor no baralho inteiro (rank percentil, com o
 * sentido invertido no hiperpropulsor). Pura — a espera de ~800 ms que dá
 * ritmo ao jogo mora em `jogadores.js`, não aqui.
 */
export function escolhaCpu(estado, jogador = "j2") {
  const carta = cartaDeTopo(estado, jogador);
  if (!carta) return null;

  const baralho = Object.keys(estado.cartas).map((id) => estado.cartas[id]);
  let melhor = null;

  for (const regra of ATRIBUTOS) {
    const meu = carta.valores[regra.chave];
    if (meu === null) continue;

    const conhecidos = baralho
      .map((c) => c.valores[regra.chave])
      .filter((v) => v !== null);
    const piores = conhecidos.filter((v) =>
      regra.vence === "maior" ? v < meu : v > meu
    ).length;
    const rank = conhecidos.length > 1 ? piores / (conhecidos.length - 1) : 1;

    if (melhor === null || rank > melhor.rank) melhor = { atributo: regra.chave, rank };
  }

  return melhor === null ? null : melhor.atributo;
}
