/* Efeitos decorativos do Codex Estelar.
   Nada aqui toca na lógica das views — se este arquivo falhar, o site
   continua funcional com o fundo estático em CSS (.stars-bg). */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const isMobile = window.innerWidth < 768;

  /* O fundo decorativo vive em js/fx/decor.js e o switch de tema em
     js/fx/toggle.js; este arquivo cuida do resto da decoração. */

  /* ============================================================
     ALTURA REAL DA TOPBAR → --topbar-h
     O painel de detalhe do planeta começa nessa altura, para não passar
     por baixo do switch de tema. Medido (e não chutado) porque o switch é
     injetado depois por js/fx/toggle.js e a nav quebra em telas estreitas.
     ============================================================ */
  const topbar = document.querySelector('.topbar');
  if (topbar) {
    const setTopbarH = () =>
      document.documentElement.style.setProperty('--topbar-h', `${topbar.offsetHeight}px`);
    setTopbarH();
    if (window.ResizeObserver) new ResizeObserver(setTopbarH).observe(topbar);
    else addEventListener('resize', setTopbarH, { passive: true });
  }


  /* ============================================================
     TRANSIÇÃO ENTRE VIEWS
     (a intro de primeira visita vive em js/fx/intro.js)
     ============================================================ */
  const app = document.getElementById('app');

  /* Fade curto da view nova. Só estética: não atrasa nem intercepta a
     navegação, e nunca deixa o conteúdo invisível. */
  if (app && !reduce) {
    document.addEventListener('click', (e) => {
      if (!e.target.closest || !e.target.closest('[data-nav]')) return;
      app.classList.remove('view-enter');
      void app.offsetWidth; /* reinicia a animação */
      app.classList.add('view-enter');
    }, { passive: true });
  }

  /* ============================================================
     4. MODAL DE FILMES — crawl com pausa e "Episódio N" em azul
     (só decoração sobre o DOM que a view já renderizou)
     ============================================================ */
  const CLAPPER = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="8.4" width="18" height="11.6" rx="2.4"></rect>
      <path d="M3.6 8.4 7 4.2l3.4 4.2"></path>
      <path d="M10.4 8.4 13.8 4.2l3.4 4.2"></path>
      <path d="M3 12.4h18"></path>
    </svg>`;

  const CLOSE_X = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
         stroke-linecap="round" aria-hidden="true" style="width:14px;height:14px">
      <path d="M6 6 18 18M18 6 6 18"></path>
    </svg>`;

  /* Círculo branco com a claquete no topo do modal de filme */
  function enhanceFilmModal(modal) {
    /* O modal de Filmes redesenhado tem cabeçalho próprio (numeral romano +
       título) e dispensa a claquete — ele se declara com data-sem-claquete. */
    if (modal.dataset.semClaquete) return;
    if (modal.querySelector('.modal-icon-circle')) return;
    const circle = document.createElement('div');
    circle.className = 'modal-icon-circle';
    circle.setAttribute('aria-hidden', 'true');
    circle.innerHTML = CLAPPER;
    const h3 = modal.querySelector('h3');
    if (h3) h3.insertAdjacentElement('beforebegin', circle);
  }

  /* O "×" vira um X em traço fino; o aria-label do botão é o que conta */
  function enhanceClose(modal) {
    const close = modal.querySelector('.modal-close');
    if (close && !close.querySelector('svg')) close.innerHTML = CLOSE_X;
  }

  new MutationObserver((muts) => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (!node.classList || !node.classList.contains('modal-backdrop')) continue;
        const modal = node.querySelector('.modal');
        if (!modal) continue;
        enhanceClose(modal);
        if (modal.classList.contains('modal-film')) enhanceFilmModal(modal);
      }
    }
  }).observe(document.body, { childList: true });

  /* ============================================================
     5. PLANETA DO CARROSSEL — círculo com gradiente na cor do tema
     e traços curvos de latitude, girando devagar.
     ============================================================ */
  const PLANET_SVG = `
<svg viewBox="0 0 160 160" aria-hidden="true">
  <defs>
    <radialGradient id="orbGrad" cx="34%" cy="30%" r="78%">
      <stop offset="0" stop-color="var(--orb-a)"/>
      <stop offset="1" stop-color="var(--orb-b)"/>
    </radialGradient>
    <clipPath id="orbClip"><circle cx="80" cy="80" r="66"/></clipPath>
  </defs>
  <circle cx="80" cy="80" r="66" fill="url(#orbGrad)"/>
  <g class="planet-orb-spin" clip-path="url(#orbClip)"
     fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="1.6" stroke-linecap="round">
    <path d="M18 62c22 12 44 12 62 4s38-10 62 2"/>
    <path d="M14 92c24 10 46 8 64 0s40-8 64 4"/>
    <path d="M26 120c20 8 40 6 56 0s32-6 50 2"/>
  </g>
  <circle cx="80" cy="80" r="66" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
</svg>`;

  let lastOrbKey = '';
  function updatePlanetOrb() {
    const card = document.getElementById('planet-card');
    const carousel = card && card.closest('.carousel');
    if (!card || !carousel) { lastOrbKey = ''; return; }

    const name = card.querySelector('h3');
    if (!name) return; /* ainda carregando */
    if (name.textContent === lastOrbKey) return;
    lastOrbKey = name.textContent;

    let stage = carousel.querySelector('.planet-orb-stage');
    if (!stage) {
      stage = document.createElement('div');
      stage.className = 'planet-orb-stage';
      stage.setAttribute('aria-hidden', 'true');
      stage.innerHTML = PLANET_SVG;
      /* à esquerda do card, depois da seta "anterior" */
      carousel.insertBefore(stage, card);
    }

    stage.classList.remove('orb-pop');
    void stage.offsetWidth;
    if (!reduce) stage.classList.add('orb-pop');
  }

  /* ============================================================
     7. NAVES E VEÍCULOS — barras de HUD sobre os valores
     (o texto original permanece; as barras são só visuais)
     ============================================================ */
  function parseNums(text) {
    const m = text.match(/\d[\d.,]*/g);
    return m ? m.map((n) => Number(n.replace(/[.,]/g, ''))) : [];
  }

  /* escala log para caber de 1 tripulante a 1 trilhão de créditos */
  const logPct = (v, maxExp) =>
    Math.max(4, Math.min(100, (Math.log10(v + 1) / maxExp) * 100));

  function addBar(row, pct, label) {
    const bar = document.createElement('div');
    bar.className = 'hud-bar';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = `<span class="hud-bar-label">${label}</span><span class="hud-track"><span class="hud-fill"></span></span>`;
    row.appendChild(bar);
    const fill = bar.querySelector('.hud-fill');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.width = pct.toFixed(1) + '%';
    }));
  }

  function updateVehicleHud() {
    const detail = document.getElementById('vehicle-detail');
    if (!detail || detail.querySelector('.hud-bar')) return;
    detail.querySelectorAll('.detail-row').forEach((row) => {
      const label = row.querySelector('.label');
      const value = row.querySelector('.value');
      if (!label || !value) return;
      const l = label.textContent;
      if (/Tripulação/.test(l)) {
        const [crew, pax] = value.textContent.split('·').map((s) => parseNums(s));
        if (crew && crew.length) addBar(row, logPct(Math.max(...crew), 6), 'Trip.');
        if (pax && pax.length) addBar(row, logPct(Math.max(...pax), 6), 'Pass.');
      } else if (/Custo/.test(l)) {
        const nums = parseNums(value.textContent);
        if (nums.length) addBar(row, logPct(Math.max(...nums), 12), 'Custo');
      }
    });
  }

  new MutationObserver(() => { updatePlanetOrb(); updateVehicleHud(); })
    .observe(document.getElementById('app') || document.body, { childList: true, subtree: true });

  /* ============================================================
     6. HUB CARDS — tilt 3D seguindo o mouse
     (delegado ao documento: as views recriam os cards)
     ============================================================ */
  if (!reduce && finePointer) {
    const clearTilt = () => {
      document.querySelectorAll('.hub-card').forEach((c) => {
        c.style.removeProperty('--tx');
        c.style.removeProperty('--ty');
      });
    };
    document.addEventListener('mousemove', (e) => {
      if (innerWidth < 1024) return;
      const card = e.target.closest ? e.target.closest('.hub-card') : null;
      if (!card) { clearTilt(); return; }
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--ty', (px * 7).toFixed(2) + 'deg');
      card.style.setProperty('--tx', (-py * 7).toFixed(2) + 'deg');
    }, { passive: true });
  }

  /* O switch Lado da Luz / Lado Sombrio vive em js/fx/toggle.js */

  /* ============================================================
     10. EASTER EGG — código Konami: ↑ ↑ ↓ ↓ ← → ← → B A
     ============================================================ */
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
  let konamiPos = 0;
  document.addEventListener('keydown', (e) => {
    konamiPos = e.code === KONAMI[konamiPos] ? konamiPos + 1 : (e.code === KONAMI[0] ? 1 : 0);
    if (konamiPos < KONAMI.length) return;
    konamiPos = 0;
    if (window.__codexDecor) window.__codexDecor.swapPlanets();
    if (document.querySelector('.force-toast')) return;
    const toast = document.createElement('div');
    toast.className = 'force-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = 'Que a Força esteja com você. Sempre.';
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('is-gone'), 3600);
    setTimeout(() => toast.remove(), 4200);
  });

  window.__codexFx = {};
})();
