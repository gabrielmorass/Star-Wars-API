/* Intro de primeira visita do Codex Estelar.
   ------------------------------------------------------------------
   Uma sequência de uns três segundos, uma vez por sessão:

     0,0s  salto de hiperespaço: estrelas em traços radiais que desaceleram
           até virar pontos (canvas próprio, por cima do gradiente);
     0,45s "Conectando aos arquivos da galáxia…" digitando, em mono;
     1,55s "Sinal recebido." na cor de acento;
     1,85s "Codex Estelar" entra letra por letra, com o espaçamento fechando;
     3,0s  a cortina dissolve e os cards do hub sobem em cascata.

   A regra que decide o desenho: a cortina NUNCA captura clique
   (pointer-events: none). Os testes do hub clicam nos cards no instante em
   que a página abre, e o usuário apressado também. O único ponto clicável
   é o botão "Pular"; Esc faz o mesmo.

   Com prefers-reduced-motion não roda nada. Usa o laço central de rAF
   (window.__codexLoop) para o quadro; sem ele, cai num rAF próprio. */
(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  try {
    if (sessionStorage.getItem('codex-intro')) return;
    sessionStorage.setItem('codex-intro', '1');
  } catch (_) {
    /* sessionStorage indisponível (modo privado restrito): segue sem intro,
       senão ela apareceria em toda navegação */
    return;
  }

  const FRASE = 'Conectando aos arquivos da galáxia…';
  const TITULO = 'Codex Estelar';

  /* marcos, em ms desde o primeiro quadro */
  const T = {
    warp: 900,       /* duração da desaceleração dos traços */
    digita: 450,     /* começa a digitar */
    porChar: 26,     /* por caractere */
    sinal: 1550,
    titulo: 1850,
    pular: 500,      /* o botão aparece */
    fim: 3000,       /* cortina começa a dissolver */
    remove: 3650,    /* sai do DOM */
  };

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
    </div>
    <button type="button" class="intro-pular" aria-label="Pular introdução">Pular</button>
  `;
  document.body.appendChild(overlay);

  const canvas = overlay.querySelector('.intro-warp');
  const tipo = overlay.querySelector('.intro-tipo');
  const linha = overlay.querySelector('.intro-line');
  const sinal = overlay.querySelector('.intro-sinal');
  const titulo = overlay.querySelector('.intro-title');
  const pular = overlay.querySelector('.intro-pular');

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
     velocidade própria. Durante o salto elas correm para fora deixando
     traço; depois viram pontos que derivam devagar. */
  const N = w < 768 ? 110 : 220;
  const estrelas = Array.from({ length: N }, () => ({
    a: Math.random() * Math.PI * 2,
    r: 0.05 + Math.random() * 0.95,
    v: 0.25 + Math.random() * 0.6,
    cor: Math.random() < 0.15 ? acento : '#ffffff',
  }));

  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

  function desenhar(t, dt) {
    const warp = t < T.warp ? 1 - easeOut(t / T.warp) : 0;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    const cx = w / 2;
    const cy = h / 2;

    for (const s of estrelas) {
      s.r += s.v * dt * (0.03 + 2.6 * warp);
      if (s.r > 1.08) s.r = 0.05 + Math.random() * 0.12;

      /* traço comprido no auge do salto; fora dele, só um ponto (o
         comprimento mínimo com ponta redonda vira um círculo) */
      const comp = 0.0012 + 0.3 * warp * s.r;
      const r1 = s.r;
      const r0 = Math.max(s.r - comp, 0);
      const cos = Math.cos(s.a);
      const sen = Math.sin(s.a);

      /* cintilação leve depois do salto, com fase própria por estrela */
      const cintila = warp ? 1 : 0.8 + 0.2 * Math.sin(t / 260 + s.a * 9);

      const x0 = cx + cos * r0 * maxR;
      const y0 = cy + sen * r0 * maxR;
      const x1 = cx + cos * r1 * maxR;
      const y1 = cy + sen * r1 * maxR;
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
  let encerrada = false;
  let parar = null;

  function quadro(dt, agora) {
    if (!inicio) inicio = agora;
    const t = agora - inicio;

    desenhar(t, dt);

    while (digitados < FRASE.length && t >= T.digita + digitados * T.porChar) {
      tipo.textContent += FRASE[digitados];
      digitados += 1;
    }
    if (digitados === FRASE.length) linha.classList.add('is-fim');

    if (t >= T.pular) pular.classList.add('is-on');
    if (t >= T.sinal) sinal.classList.add('is-on');
    if (t >= T.titulo) titulo.classList.add('is-on');
    if (t >= T.fim) encerrar();
  }

  /* Dissolve a cortina e revela o hub em cascata. Chamado pelo tempo, pelo
     botão ou por Esc; só o primeiro vale. */
  function encerrar() {
    if (encerrada) return;
    encerrada = true;

    overlay.classList.add('is-done');
    pular.disabled = true;
    document.removeEventListener('keydown', aoTeclar);

    const cards = document.querySelector('.hub-cards');
    if (cards) {
      cards.querySelectorAll('.hub-card').forEach((c, i) => c.style.setProperty('--i', i));
      cards.classList.add('is-cascata');
    }

    setTimeout(() => {
      if (parar) parar();
      window.removeEventListener('resize', medir);
      overlay.remove();
    }, T.remove - T.fim);
  }

  function aoTeclar(e) {
    if (e.key === 'Escape') encerrar();
  }

  pular.addEventListener('click', encerrar);
  document.addEventListener('keydown', aoTeclar);

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
    encerrada,
    noDom: overlay.isConnected,
    /* desenha um quadro num instante sintético, sem mover as estrelas:
       é o que permite fotografar o salto, que acontece antes do `load` */
    quadroEm: (t) => desenhar(t, 0),
  });
})();
