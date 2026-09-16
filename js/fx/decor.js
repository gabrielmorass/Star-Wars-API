/* Fundo decorativo do Codex Estelar: planetas cortados nos cantos,
   pontos, estrelas de 4 pontas com halo e um cometa.

   Cada peça é ancorada às BORDAS da janela por CSS (e não a um viewBox
   fixo), para que continuem fora da coluna de conteúdo em qualquer
   largura de tela. Camada fixa, atrás de tudo e sem capturar cliques.

   Puramente decorativo — não conhece a lógica das views. */
(() => {
  'use strict';

  const host = document.querySelector('.space-decor');
  if (!host) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* Estrela de 4 pontas com lados côncavos */
  const STAR = `
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 2C22 14 26 18 38 20 26 22 22 26 20 38 18 26 14 22 2 20 14 18 18 14 20 2Z"/>
    </svg>`;

  host.innerHTML = `
    <div class="decor-layer decor-planets" data-depth="14">
      <span class="decor-planet decor-planet--a"></span>
      <span class="decor-planet decor-planet--b"></span>
      <span class="decor-planet decor-planet--c"></span>
    </div>

    <div class="decor-layer decor-dots" data-depth="26">
      <i></i><i></i><i></i><i></i><i></i><i></i>
    </div>

    <div class="decor-layer decor-sparks" data-depth="40">
      <span class="decor-spark decor-spark--1">${STAR}</span>
      <span class="decor-spark decor-spark--2">${STAR}</span>
    </div>

    <div class="decor-layer decor-comets" data-depth="34">
      <span class="decor-comet"></span>
    </div>`;

  /* ---------- Parallax leve (poucos px) ----------
     Entra no laço único de js/fx/loop.js e sai dele assim que o alvo é
     alcançado: parado, o parallax não custa quadro nenhum. */
  if (!reduce && finePointer) {
    const layers = [...host.querySelectorAll('.decor-layer')];
    let alvoX = 0;
    let alvoY = 0;
    let atualX = 0;
    let atualY = 0;
    let inscrito = false;

    const passo = () => {
      atualX += (alvoX - atualX) * 0.18;
      atualY += (alvoY - atualY) * 0.18;
      for (const l of layers) {
        const d = Number(l.dataset.depth) || 20;
        l.style.transform =
          `translate(${(-atualX * d).toFixed(1)}px, ${(-atualY * d * 0.6).toFixed(1)}px)`;
      }
      if (Math.abs(alvoX - atualX) < 0.001 && Math.abs(alvoY - atualY) < 0.001) {
        window.__codexLoop.unsubscribe(passo);
        host.classList.remove('is-parallax');
        inscrito = false;
      }
    };

    addEventListener('mousemove', (e) => {
      alvoX = e.clientX / innerWidth - 0.5;
      alvoY = e.clientY / innerHeight - 0.5;
      if (!inscrito && window.__codexLoop) {
        host.classList.add('is-parallax');
        window.__codexLoop.subscribe(passo);
        inscrito = true;
      }
    }, { passive: true });
  }

  /* ---------- Troca de tema: planetas saem e voltam na cor nova ---------- */
  function swapPlanets() {
    if (reduce) return;
    host.classList.add('is-swapping');
    setTimeout(() => host.classList.remove('is-swapping'), 300);
  }

  window.__codexDecor = { swapPlanets };
})();
