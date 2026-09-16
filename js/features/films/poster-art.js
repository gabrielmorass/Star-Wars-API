/* ---------------- Pôsteres procedurais ----------------
   Um SVG por episódio, desenhado aqui — nenhuma imagem externa, nenhum
   material com direito autoral. Cada arte é só uma leitura da paleta e do
   cenário dominante do filme, na proporção 2:3 do pôster (200×300).

   Cada episódio devolve também o par de cores que o card usa nas bordas,
   no numeral e no brilho de hover, em `--f1` / `--f2`. */

const VB = 'viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice"';

/* Campo de estrelas determinístico: o mesmo episódio desenha sempre o mesmo
   céu (nada de piscar a cada re-render da grade). */
function estrelas(semente, quantas, opacidade = 0.5) {
  let x = semente * 9301 + 49297;
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  let saida = "";
  for (let i = 0; i < quantas; i++) {
    const cx = (rnd() * 200).toFixed(1);
    const cy = (rnd() * 300).toFixed(1);
    const r = (0.4 + rnd() * 1.1).toFixed(2);
    saida += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" opacity="${(opacidade * (0.4 + rnd() * 0.6)).toFixed(2)}"/>`;
  }
  return saida;
}

/* I — dourado e verde, com curvas (Naboo) */
function arteI() {
  return `<svg ${VB} aria-hidden="true">
    <defs>
      <linearGradient id="fa1" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stop-color="#1c2a16"/><stop offset="0.55" stop-color="#3f4a1b"/>
        <stop offset="1" stop-color="#c9a227"/>
      </linearGradient>
    </defs>
    <rect width="200" height="300" fill="url(#fa1)"/>
    <g fill="none" stroke="#e8c85a" stroke-linecap="round" opacity="0.55">
      <path d="M-10 214c46-44 92-44 128-10s54 44 92 22" stroke-width="2.4"/>
      <path d="M-10 244c52-48 104-42 140-6s42 36 80 18" stroke-width="1.8" opacity="0.7"/>
      <path d="M-10 186c40-38 82-40 116-12s60 40 104 18" stroke-width="1.4" opacity="0.5"/>
    </g>
    <g fill="none" stroke="#7fae56" stroke-width="1.6" opacity="0.45">
      <path d="M-6 268c54-36 108-30 146 2s34 30 66 16"/>
    </g>
    <circle cx="142" cy="64" r="30" fill="#e8c85a" opacity="0.2"/>
  </svg>`;
}

/* II — azul aço, linhas (as fileiras do exército clone) */
function arteII() {
  let linhas = "";
  for (let i = 0; i < 16; i++) {
    const y = 150 + i * 10;
    const inset = i * 3.2;
    linhas += `<path d="M${inset - 10} ${y}H${210 - inset}" stroke="#8fb6d9" stroke-width="${(1.5 - i * 0.06).toFixed(2)}" opacity="${(0.5 - i * 0.022).toFixed(2)}"/>`;
  }
  return `<svg ${VB} aria-hidden="true">
    <defs>
      <linearGradient id="fa2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0d1b28"/><stop offset="0.6" stop-color="#1d3a52"/>
        <stop offset="1" stop-color="#2f5d80"/>
      </linearGradient>
    </defs>
    <rect width="200" height="300" fill="url(#fa2)"/>
    ${estrelas(2, 40, 0.4)}
    <g fill="none" stroke-linecap="round">${linhas}</g>
    <g stroke="#bcd8ef" stroke-width="1.2" opacity="0.5">
      <path d="M40 150v-46M100 150v-62M160 150v-40"/>
    </g>
  </svg>`;
}

/* III — vermelho lava, com veios (Mustafar) */
function arteIII() {
  return `<svg ${VB} aria-hidden="true">
    <defs>
      <linearGradient id="fa3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1a0704"/><stop offset="0.5" stop-color="#5e1409"/>
        <stop offset="1" stop-color="#c23b0d"/>
      </linearGradient>
    </defs>
    <rect width="200" height="300" fill="url(#fa3)"/>
    <g fill="none" stroke="#ff8a3d" stroke-linecap="round">
      <path d="M-10 250c34-10 46-38 78-42s46 24 78 14s40-22 64-14" stroke-width="3" opacity="0.85"/>
      <path d="M-10 282c40-14 52-30 84-30s54 22 86 10s36-16 50-10" stroke-width="2.2" opacity="0.65"/>
      <path d="M-10 214c26-6 40-24 64-24s34 16 58 10s34-16 58-10" stroke-width="1.6" opacity="0.45"/>
      <path d="M30 300c6-28 2-46 14-64M120 300c-6-26-2-44 8-58" stroke-width="1.4" opacity="0.4"/>
    </g>
    <g fill="#ffca7a" opacity="0.5">
      <circle cx="58" cy="246" r="2.2"/><circle cx="132" cy="262" r="1.8"/><circle cx="96" cy="228" r="1.4"/>
    </g>
  </svg>`;
}

/* IV — areia com dois sóis (Tatooine) */
function arteIV() {
  return `<svg ${VB} aria-hidden="true">
    <defs>
      <linearGradient id="fa4" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#e8a24a"/><stop offset="0.48" stop-color="#d9873a"/>
        <stop offset="0.52" stop-color="#c98c56"/><stop offset="1" stop-color="#8a5a33"/>
      </linearGradient>
    </defs>
    <rect width="200" height="300" fill="url(#fa4)"/>
    <circle cx="120" cy="106" r="30" fill="#fff0c4" opacity="0.92"/>
    <circle cx="120" cy="106" r="46" fill="#ffe08a" opacity="0.22"/>
    <circle cx="74" cy="126" r="17" fill="#ffe7a8" opacity="0.85"/>
    <circle cx="74" cy="126" r="27" fill="#ffd97a" opacity="0.18"/>
    <g fill="#a9703f">
      <path d="M-10 172c40 10 62-6 96-2s66 16 114 4v130H-10z" opacity="0.75"/>
      <path d="M-10 216c46 12 70-8 108-2s58 14 102 2v90H-10z" opacity="0.65"/>
    </g>
  </svg>`;
}

/* V — branco gelo com neblina (Hoth) */
function arteV() {
  return `<svg ${VB} aria-hidden="true">
    <defs>
      <linearGradient id="fa5" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6d8ba6"/><stop offset="0.45" stop-color="#b9cedd"/>
        <stop offset="1" stop-color="#eef5fa"/>
      </linearGradient>
      <linearGradient id="fa5n" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0.85"/>
      </linearGradient>
    </defs>
    <rect width="200" height="300" fill="url(#fa5)"/>
    <g fill="#ffffff" opacity="0.8">
      <path d="M-10 190l44-52 30 34 30-44 42 50 74-30v152H-10z"/>
    </g>
    <g fill="#c8d9e6" opacity="0.6">
      <path d="M-10 226l52-34 38 26 38-30 92 38v74H-10z"/>
    </g>
    <rect y="150" width="200" height="150" fill="url(#fa5n)" opacity="0.55"/>
    ${estrelas(5, 26, 0.35)}
  </svg>`;
}

/* VI — verde floresta com uma lua (Endor) */
function arteVI() {
  let troncos = "";
  for (let i = 0; i < 7; i++) {
    const x = 6 + i * 30 + (i % 2) * 8;
    const w = 7 + (i % 3) * 3;
    troncos += `<rect x="${x}" y="${120 + (i % 3) * 14}" width="${w}" height="200" fill="#10240f" opacity="${(0.55 + (i % 3) * 0.12).toFixed(2)}"/>`;
  }
  return `<svg ${VB} aria-hidden="true">
    <defs>
      <linearGradient id="fa6" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0a1c14"/><stop offset="0.5" stop-color="#1d4028"/>
        <stop offset="1" stop-color="#2f6134"/>
      </linearGradient>
    </defs>
    <rect width="200" height="300" fill="url(#fa6)"/>
    ${estrelas(6, 30, 0.45)}
    <circle cx="142" cy="72" r="34" fill="#dfe8cf" opacity="0.9"/>
    <circle cx="142" cy="72" r="34" fill="none" stroke="#9fb08a" stroke-width="1.4" opacity="0.7"/>
    <g fill="#b9c8a6" opacity="0.5">
      <circle cx="132" cy="62" r="6"/><circle cx="152" cy="82" r="4.5"/><circle cx="148" cy="58" r="3"/>
    </g>
    ${troncos}
    <g fill="#163a20" opacity="0.8">
      <path d="M-10 250c40-16 70 6 104-6s66-14 116 6v60H-10z"/>
    </g>
  </svg>`;
}

const ARTE = {
  1: { svg: arteI, f1: "#e8c85a", f2: "#7fae56" },
  2: { svg: arteII, f1: "#8fb6d9", f2: "#2f5d80" },
  3: { svg: arteIII, f1: "#ff8a3d", f2: "#c23b0d" },
  4: { svg: arteIV, f1: "#ffe08a", f2: "#c98c56" },
  5: { svg: arteV, f1: "#dcebf6", f2: "#6d8ba6" },
  6: { svg: arteVI, f1: "#9fd08a", f2: "#2f6134" },
};

const PADRAO = { svg: arteIV, f1: "#ffe08a", f2: "#c98c56" };

export function posterDe(episodeId) {
  const a = ARTE[Number(episodeId)] || PADRAO;
  return { svg: a.svg(), f1: a.f1, f2: a.f2 };
}
