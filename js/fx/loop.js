/* Laço de animação único do Codex Estelar.

   Todo efeito que precisa de quadro (planeta do painel, mini-planeta do
   mapa, parallax do fundo, animação de zoom) se inscreve aqui em vez de
   abrir o próprio requestAnimationFrame. Vantagens:

   - um só rAF para a página inteira, em vez de um por efeito;
   - quem não está visível se desinscreve e deixa de custar quadro;
   - sem inscritos, o laço para sozinho (nenhum rAF agendado);
   - `document.hidden` congela tudo e retoma ao voltar para a aba.

   O módulo também se publica em `window.__codexLoop` para os scripts
   clássicos (js/fx/decor.js), que não usam import. */

const subs = new Set();

let raf = 0;
let last = 0;

/* Contadores de diagnóstico: quanto tempo de JS o laço consome por quadro.
   Custam duas leituras de relógio por quadro e são o que permite medir a
   passada de performance sem chutar. */
const stats = { frames: 0, jsMs: 0 };

function frame(now) {
  const t0 = performance.now();

  /* dt em segundos, limitado para um retorno de aba não dar um salto */
  const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
  last = now;

  /* cópia: um callback pode se desinscrever durante o próprio quadro */
  for (const fn of [...subs]) {
    try {
      fn(dt, now);
    } catch (err) {
      /* um efeito quebrado não pode derrubar os outros */
      subs.delete(fn);
      console.error("[codex-loop] efeito removido após erro:", err);
    }
  }

  stats.frames += 1;
  stats.jsMs += performance.now() - t0;

  raf = subs.size && !document.hidden ? requestAnimationFrame(frame) : 0;
  if (!raf) last = 0;
}

function start() {
  if (!raf && subs.size && !document.hidden) raf = requestAnimationFrame(frame);
}

export function subscribe(fn) {
  subs.add(fn);
  start();
  return () => unsubscribe(fn);
}

export function unsubscribe(fn) {
  subs.delete(fn);
}

/* quantos efeitos estão pedindo quadro agora — usado nas medições */
export function activeCount() {
  return subs.size;
}

document.addEventListener("visibilitychange", start);

/* zera e devolve o acumulado: usado nas medições de performance */
export function readStats() {
  const out = { ...stats };
  stats.frames = 0;
  stats.jsMs = 0;
  out.msPorQuadro = out.frames ? +(out.jsMs / out.frames).toFixed(3) : 0;
  return out;
}

window.__codexLoop = { subscribe, unsubscribe, activeCount, readStats };
