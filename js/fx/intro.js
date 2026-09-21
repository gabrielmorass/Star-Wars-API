/* Intro de primeira visita do Codex Estelar.
   ------------------------------------------------------------------
   Uma vez por sessão, a chegada ao site é um salto de hiperespaço:

     0,0s  chegada: estrelas em traços radiais que desaceleram até virar um
           campo estrelado em cruzeiro (fluxo lento para fora, rastro curto);
     0,45s "Conectando aos arquivos da galáxia…" digitando, em mono;
     1,55s "Sinal recebido." na cor de acento;
     1,85s "Codex Estelar" entra letra por letra, com o espaçamento fechando;
     2,7s  "Clique para entrar" pulsando. O fundo continua em movimento
           enquanto a pessoa quiser olhar.

   Ao clicar (ou Enter, Espaço, Esc): salto — as estrelas aceleram até virar
   traços longos com um clarão de acento, a cortina dissolve e os cards do
   hub sobem em cascata. Clicar antes do fim da sequência também salta.

   Sob o Cypress a cortina NÃO espera clique nem captura ponteiro: toda a
   suíte abre o hub e clica num card no primeiro quadro, e um card coberto é
   falha de teste. Nesse modo ela sai sozinha aos 3s, como a versão anterior.
   O diagnóstico da própria intro força o modo interativo com a chave
   `codex-intro-espera` no sessionStorage.

   Com prefers-reduced-motion não roda nada. Usa o laço central de rAF
   (window.__codexLoop) para o quadro; sem ele, cai num rAF próprio.
   O campo estrelado é adaptado do "Hyperspace" de jh3y (CodePen dEpKMe). */
(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  let espera = !window.Cypress;
  try {
    if (sessionStorage.getItem('codex-intro')) return;
    sessionStorage.setItem('codex-intro', '1');
    if (sessionStorage.getItem('codex-intro-espera') === '1') espera = true;
  } catch (_) {
    /* sessionStorage indisponível (modo privado restrito): segue sem intro,
       senão ela apareceria em toda navegação */
    return;
  }

  const TOQUE = window.matchMedia('(pointer: coarse)').matches;
  const FRASE = 'Conectando aos arquivos da galáxia…';
  const TITULO = 'Codex Estelar';

  /* marcos, em ms desde o primeiro quadro */
  const T = {
    chegada: 900,   /* desaceleração dos traços até o cruzeiro */
    digita: 450,    /* começa a digitar */
    porChar: 26,    /* por caractere */
    sinal: 1550,
    titulo: 1850,
    convite: 2700,  /* "Clique para entrar" */
    auto: 3000,     /* sem espera (Cypress): salta sozinha aqui */
  };

  /* depois do clique, em ms desde o salto */
  const S = {
    rampa: 380,     /* até a velocidade máxima */
    dissolve: 450,  /* a cortina começa a sumir */
    remove: 1150,   /* sai do DOM */
  };

  /* velocidade de fundo enquanto espera: 0 é parado, 1 é o salto */
  const CRUZEIRO = 0.09;

  /* ---------------- DOM ---------------- */
  const overlay = document.createElement('div');
  overlay.className = 'intro-overlay';
  overlay.innerHTML = `
    <canvas class="intro-warp" aria-hidden="true"></canvas>
    <div class="intro-texto" aria-hidden="true">
      <p class="intro-line"><span class="intro-tipo"></span><i class="intro-cursor"></i></p>
      <p class="intro-sinal">Sinal recebido.</p>
      <div class="intro-title">${[...TITULO]
        .map((ch, i) => `<span class="intro-letra" style="--i:${i}">${ch}</span>`)
        .join('')}</div>
      <p class="intro-convite">${TOQUE ? 'Toque para entrar' : 'Clique para entrar'}</p>
    </div>
  `;
  if (espera) {
    overlay.classList.add('is-interativa');
    overlay.setAttribute('role', 'button');
    overlay.tabIndex = 0;
    overlay.setAttribute('aria-label', 'Entrar no Codex Estelar');
  }
  document.body.appendChild(overlay);

  const canvas = overlay.querySelector('.intro-warp');
  const tipo = overlay.querySelector('.intro-tipo');
  const linha = overlay.querySelector('.intro-line');
  const sinal = overlay.querySelector('.intro-sinal');
  const titulo = overlay.querySelector('.intro-title');

  /* ---------------- Estrelas ---------------- */
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let w = 0;
  let h = 0;
  let maxR = 1;

  function medir() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    maxR = Math.hypot(w, h) / 2;
  }
  medir();
  window.addEventListener('resize', medir, { passive: true });

  const acento =
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#cfe4ff';

  /* Cada estrela é um raio a partir do centro: ângulo, distância (0 a 1) e
     velocidade própria. Quem sai pela borda renasce perto do centro. */
  const N = w < 768 ? 110 : 220;
  const estrelas = Array.from({ length: N }, () => ({
    a: Math.random() * Math.PI * 2,
    r: 0.05 + Math.random() * 0.95,
    v: 0.25 + Math.random() * 0.6,
    cor: Math.random() < 0.15 ? acento : '#ffffff',
  }));

  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeIn = (x) => x * x * x;

  let tSalto = 0;

  /* 1 na chegada e no salto, CRUZEIRO no meio */
  function nivelWarp(t, agora) {
    if (tSalto) {
      const x = Math.min((agora - tSalto) / S.rampa, 1);
      return CRUZEIRO + (1 - CRUZEIRO) * easeIn(x);
    }
    return Math.max(CRUZEIRO, 1 - easeOut(Math.min(t / T.chegada, 1)));
  }

  function desenhar(t, dt, warp) {
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    const cx = w / 2;
    const cy = h / 2;
    /* o rastro cresce mais que a velocidade: em cruzeiro é quase um ponto,
       no salto vira um traço comprido */
    const rastro = Math.pow(warp, 1.5);

    for (const s of estrelas) {
      s.r += s.v * dt * (0.05 + 2.6 * warp);
      if (s.r > 1.08) s.r = 0.05 + Math.random() * 0.12;

      const comp = 0.0012 + 0.3 * rastro * s.r;
      const r1 = s.r;
      const r0 = Math.max(s.r - comp, 0);
      const cos = Math.cos(s.a);
      const sen = Math.sin(s.a);

      const x0 = cx + cos * r0 * maxR;
      const y0 = cy + sen * r0 * maxR;
      const x1 = cx + cos * r1 * maxR;
      const y1 = cy + sen * r1 * maxR;

      /* cintilação leve fora do salto, com fase própria por estrela */
      const cintila = warp > 0.5 ? 1 : 0.8 + 0.2 * Math.sin(t / 260 + s.a * 9);
      const alfa = (0.45 + 0.55 * s.r) * cintila;
      const grosso = 1.6 + 2.4 * s.r;

      ctx.strokeStyle = s.cor;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);

      /* halo: o mesmo traço, mais largo e quase transparente, por baixo */
      ctx.globalAlpha = alfa * 0.16;
      ctx.lineWidth = grosso * 2.8;
      ctx.stroke();

      ctx.globalAlpha = alfa;
      ctx.lineWidth = grosso;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------- Linha do tempo ---------------- */
  let inicio = 0;
  let digitados = 0;
  let dissolvida = false;
  let parar = null;

  function quadro(dt, agora) {
    if (!inicio) inicio = agora;
    const t = agora - inicio;

    desenhar(t, dt, nivelWarp(t, agora));

    while (digitados < FRASE.length && t >= T.digita + digitados * T.porChar) {
      tipo.textContent += FRASE[digitados];
      digitados += 1;
    }
    if (digitados === FRASE.length) linha.classList.add('is-fim');

    if (t >= T.sinal) sinal.classList.add('is-on');
    if (t >= T.titulo) titulo.classList.add('is-on');
    if (t >= T.convite) overlay.classList.add('is-pronta');
    if (!espera && t >= T.auto) entrar();
  }

  /* O salto: acelera as estrelas, acende o clarão, e um pouco depois
     dissolve a cortina revelando o hub em cascata. Só o primeiro vale. */
  function entrar() {
    if (tSalto) return;
    tSalto = performance.now();
    overlay.classList.add('is-salto');
    overlay.removeAttribute('role');
    overlay.tabIndex = -1;
    document.removeEventListener('keydown', aoTeclar);
    setTimeout(dissolver, S.dissolve);
  }

  function dissolver() {
    dissolvida = true;
    overlay.classList.add('is-done');

    const cards = document.querySelector('.hub-cards');
    if (cards) {
      cards.querySelectorAll('.hub-card').forEach((c, i) => c.style.setProperty('--i', i));
      cards.classList.add('is-cascata');
    }

    setTimeout(() => {
      if (parar) parar();
      window.removeEventListener('resize', medir);
      overlay.remove();
    }, S.remove - S.dissolve);
  }

  /* Tecla num campo de texto é digitação, não comando: sem isso o espaço de
     uma busca sumia (a intro engolia o preventDefault). */
  function aoTeclar(e) {
    const alvo = e.target;
    if (alvo && (alvo.matches('input, textarea, select') || alvo.isContentEditable)) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      if (e.key === ' ') e.preventDefault();
      entrar();
    }
  }

  /* só no modo interativo: sem espera, a cortina sai sozinha e não há o que
     ouvir — e o teclado da suíte fica em paz */
  if (espera) {
    overlay.addEventListener('click', entrar);
    document.addEventListener('keydown', aoTeclar);
  }

  /* laço central quando existe; senão um rAF próprio com o mesmo contrato */
  const loop = window.__codexLoop;
  if (loop && typeof loop.subscribe === 'function') {
    parar = loop.subscribe(quadro);
  } else {
    let raf = 0;
    let ultimo = 0;
    const passo = (agora) => {
      const dt = ultimo ? Math.min((agora - ultimo) / 1000, 0.05) : 0;
      ultimo = agora;
      quadro(dt, agora);
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    parar = () => cancelAnimationFrame(raf);
  }

  /* sonda de diagnóstico, no mesmo espírito de window.__codexLoop */
  window.__introInfo = () => ({
    t: inicio ? performance.now() - inicio : 0,
    digitados,
    esperando: espera,
    saltou: Boolean(tSalto),
    dissolvida,
    noDom: overlay.isConnected,
    /* desenha um quadro num instante sintético, sem mover as estrelas:
       é o que permite fotografar a chegada, que acontece antes do `load` */
    quadroEm: (t, warp) => desenhar(t, 0, warp ?? nivelWarp(t, performance.now())),
  });
})();
