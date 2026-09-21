/* Hangar 3D do painel de Naves e Veículos.
   ------------------------------------------------------------------
   Three.js r128 em UMD, carregado sob demanda do cdnjs: o projeto não tem
   build nem bundler, e nenhuma outra view precisa de 3D — baixar 600 kB na
   abertura do site para um painel que talvez ninguém abra seria caro. O
   script só é injetado na primeira vez que esta view aparece.

   Os modelos são montados aqui com primitivas (box, cilindro, esfera, cone,
   toro). Nada de .glb, .obj ou loader externo: mantém o projeto sem
   dependência de arquivo binário e faz cada classe ser reconhecível pela
   silhueta, que é o que importa nesse tamanho de tela.

   Sem WebGL, ou com prefers-reduced-motion, nada disso é criado e a view
   fica com a silhueta SVG estática. */
import { subscribe, unsubscribe } from "../../fx/loop.js";

const CDN = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- Disponibilidade ---------------- */

let webgl = null;

export function hangarDisponivel() {
  if (REDUCE) return false;
  if (webgl === null) {
    try {
      const c = document.createElement("canvas");
      webgl = Boolean(
        window.WebGLRenderingContext &&
          (c.getContext("webgl") || c.getContext("experimental-webgl"))
      );
    } catch (_) {
      webgl = false;
    }
  }
  return webgl;
}

/* ---------------- Carga sob demanda ---------------- */

let promessa = null;

function carregarThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (promessa) return promessa;

  promessa = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = CDN;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.addEventListener("load", () =>
      window.THREE ? resolve(window.THREE) : reject(new Error("THREE ausente"))
    );
    s.addEventListener("error", () => reject(new Error("cdnjs indisponível")));
    document.head.appendChild(s);
  }).catch((erro) => {
    /* zera para uma próxima abertura poder tentar de novo */
    promessa = null;
    throw erro;
  });

  return promessa;
}

/* ---------------- Modelos ----------------
   Todos são montados em unidades arbitrárias e normalizados no fim
   (`normalizar`), então o que importa aqui é a PROPORÇÃO entre as peças. */

function corDeAcento() {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();
  return v || "#cfe4ff";
}

/* Cada peça é malha + arestas: a malha dá volume, as arestas dão o traço de
   blueprint na cor do tema. Ficam no mesmo Group para escalar juntas. */
function peca(THREE, geo, mats, { pos, rot, esc } = {}) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, mats.corpo));
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), mats.aresta));
  if (pos) g.position.set(...pos);
  if (rot) g.rotation.set(...rot);
  if (esc) g.scale.set(...esc);
  return g;
}

const MODELOS = {
  /* fuselagem cilíndrica + cone de proa + 4 asas em X + 4 canhões */
  caca(THREE, m) {
    const g = new THREE.Group();
    g.add(peca(THREE, new THREE.CylinderGeometry(0.26, 0.3, 2.2, 12), m, {
      rot: [Math.PI / 2, 0, 0],
    }));
    g.add(peca(THREE, new THREE.ConeGeometry(0.26, 0.9, 12), m, {
      pos: [0, 0, 1.5],
      rot: [Math.PI / 2, 0, 0],
    }));
    const asa = () => new THREE.BoxGeometry(2.2, 0.06, 0.62);
    [1, -1].forEach((sx) =>
      [1, -1].forEach((sy) => {
        g.add(peca(THREE, asa(), m, {
          pos: [sx * 1.15, sy * 0.42, -0.35],
          rot: [0, 0, sy * sx * 0.38],
        }));
        g.add(peca(THREE, new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), m, {
          pos: [sx * 2.16, sy * 0.72, -0.3],
          rot: [Math.PI / 2, 0, 0],
        }));
      })
    );
    return g;
  },

  /* fuselagem curta + duas asas delta achatadas + dois motores */
  interceptador(THREE, m) {
    const g = new THREE.Group();
    g.add(peca(THREE, new THREE.CylinderGeometry(0.22, 0.26, 1.8, 10), m, {
      rot: [Math.PI / 2, 0, 0],
    }));
    g.add(peca(THREE, new THREE.ConeGeometry(0.22, 1, 10), m, {
      pos: [0, 0, 1.35],
      rot: [Math.PI / 2, 0, 0],
    }));
    [1, -1].forEach((s) => {
      g.add(peca(THREE, new THREE.ConeGeometry(0.95, 2.4, 4), m, {
        pos: [s * 0.95, 0, -0.35],
        rot: [Math.PI / 2, 0, s * 0.5],
        esc: [1, 1, 0.07],
      }));
      g.add(peca(THREE, new THREE.CylinderGeometry(0.16, 0.2, 0.7, 10), m, {
        pos: [s * 0.4, 0, -1.2],
        rot: [Math.PI / 2, 0, 0],
      }));
    });
    return g;
  },

  /* cunha muito alongada + torre de comando + duas esferas de radar */
  cruzador(THREE, m) {
    const g = new THREE.Group();
    /* Cone de 3 lados achatado: dá a cunha triangular sem geometria
       customizada. A rotação é só em X — o eixo do cone (Y local) vira Z
       (proa para a frente) e o achatamento em Z local vira altura. Com um
       roll em Z junto, o eixo ia parar noutro lugar e a torre descolava do
       casco. */
    g.add(peca(THREE, new THREE.ConeGeometry(1.25, 5, 3), m, {
      rot: [Math.PI / 2, 0, 0],
      esc: [1, 1, 0.3],
    }));
    g.add(peca(THREE, new THREE.BoxGeometry(0.6, 0.26, 0.62), m, {
      pos: [0, 0.26, -1.55],
    }));
    g.add(peca(THREE, new THREE.BoxGeometry(0.34, 0.18, 0.34), m, {
      pos: [0, 0.48, -1.55],
    }));
    [1, -1].forEach((s) =>
      g.add(peca(THREE, new THREE.SphereGeometry(0.13, 12, 10), m, {
        pos: [s * 0.18, 0.66, -1.55],
      }))
    );
    return g;
  },

  /* disco achatado + duas mandíbulas + cabine deslocada */
  cargueiro(THREE, m) {
    const g = new THREE.Group();
    g.add(peca(THREE, new THREE.CylinderGeometry(1.35, 1.35, 0.42, 20), m));
    [1, -1].forEach((s) =>
      g.add(peca(THREE, new THREE.BoxGeometry(0.28, 0.3, 1.25), m, {
        pos: [s * 0.42, 0, 1.75],
      }))
    );
    g.add(peca(THREE, new THREE.BoxGeometry(0.62, 0.3, 0.72), m, {
      pos: [1.05, 0.05, -0.75],
      rot: [0, -0.4, 0],
    }));
    g.add(peca(THREE, new THREE.CylinderGeometry(0.3, 0.3, 0.2, 14), m, {
      pos: [0, 0.3, 0],
    }));
    return g;
  },

  /* fuselagem + duas asas grandes dobradas para baixo em V + asa dorsal */
  transporte(THREE, m) {
    const g = new THREE.Group();
    g.add(peca(THREE, new THREE.BoxGeometry(0.55, 0.55, 2.3), m));
    g.add(peca(THREE, new THREE.ConeGeometry(0.4, 1.1, 6), m, {
      pos: [0, 0, 1.6],
      rot: [Math.PI / 2, 0, 0],
    }));

    /* Cada asa pende de um pivô e o pivô é que gira: rotacionar a caixa no
       próprio centro deixava as duas quase verticais, sem o V. */
    [1, -1].forEach((s) => {
      const pivo = new THREE.Group();
      pivo.position.set(s * 0.26, 0.12, -0.45);
      pivo.rotation.z = s * 0.95;
      pivo.add(
        peca(THREE, new THREE.BoxGeometry(0.08, 2.3, 0.95), m, {
          pos: [0, -1.15, 0],
        })
      );
      g.add(pivo);
    });

    g.add(peca(THREE, new THREE.BoxGeometry(0.08, 1.9, 0.85), m, {
      pos: [0, 1.05, -0.45],
    }));
    return g;
  },

  /* esfera + anel equatorial + cratera encaixada */
  estacao(THREE, m) {
    const g = new THREE.Group();
    g.add(peca(THREE, new THREE.SphereGeometry(1.5, 24, 18), m));
    g.add(peca(THREE, new THREE.TorusGeometry(1.52, 0.05, 8, 40), m, {
      rot: [Math.PI / 2, 0, 0],
    }));
    g.add(peca(THREE, new THREE.SphereGeometry(0.45, 16, 12), m, {
      pos: [0.75, 0.75, 0.9],
    }));
    return g;
  },

  /* casco liso e comprido + proa arredondada + dois motores atrás */
  iate(THREE, m) {
    const g = new THREE.Group();
    g.add(peca(THREE, new THREE.CylinderGeometry(0.42, 0.34, 3.4, 16), m, {
      rot: [Math.PI / 2, 0, 0],
      esc: [1, 1, 0.55],
    }));
    g.add(peca(THREE, new THREE.SphereGeometry(0.42, 16, 12), m, {
      pos: [0, 0, 1.7],
      esc: [1, 0.55, 1.1],
    }));
    [1, -1].forEach((s) =>
      g.add(peca(THREE, new THREE.CylinderGeometry(0.18, 0.22, 0.75, 12), m, {
        pos: [s * 0.36, 0, -1.95],
        rot: [Math.PI / 2, 0, 0],
      }))
    );
    return g;
  },

  /* corpo baixo e comprido + dois bocais de repulsor */
  speeder(THREE, m) {
    const g = new THREE.Group();
    g.add(peca(THREE, new THREE.BoxGeometry(0.85, 0.42, 2.9), m));
    g.add(peca(THREE, new THREE.ConeGeometry(0.42, 0.9, 8), m, {
      pos: [0, 0, 1.85],
      rot: [Math.PI / 2, 0, 0],
      esc: [1, 1, 0.5],
    }));
    [1, -1].forEach((s) =>
      g.add(peca(THREE, new THREE.CylinderGeometry(0.22, 0.22, 1.5, 12), m, {
        pos: [s * 0.62, -0.28, -0.2],
        rot: [Math.PI / 2, 0, 0],
      }))
    );
    g.add(peca(THREE, new THREE.BoxGeometry(0.1, 0.5, 0.7), m, {
      pos: [0, 0.42, -0.9],
    }));
    return g;
  },

  /* cabine + quatro pernas articuladas em ângulo */
  walker(THREE, m) {
    const g = new THREE.Group();
    g.add(peca(THREE, new THREE.BoxGeometry(1.5, 0.85, 2.1), m, {
      pos: [0, 0.95, 0],
    }));
    g.add(peca(THREE, new THREE.BoxGeometry(0.85, 0.6, 0.7), m, {
      pos: [0, 1.05, 1.35],
    }));
    [1, -1].forEach((sx) =>
      [1, -1].forEach((sz) => {
        /* coxa inclinada para fora, canela de volta para o centro */
        g.add(peca(THREE, new THREE.CylinderGeometry(0.11, 0.09, 1.0, 8), m, {
          pos: [sx * 0.78, 0.4, sz * 0.72],
          rot: [0, 0, sx * -0.3],
        }));
        g.add(peca(THREE, new THREE.CylinderGeometry(0.09, 0.07, 1.0, 8), m, {
          pos: [sx * 0.95, -0.5, sz * 0.72],
          rot: [0, 0, sx * 0.18],
        }));
      })
    );
    return g;
  },

  generico(THREE, m) {
    const g = new THREE.Group();
    g.add(peca(THREE, new THREE.BoxGeometry(1, 0.6, 2.2), m));
    g.add(peca(THREE, new THREE.ConeGeometry(0.5, 1, 8), m, {
      pos: [0, 0, 1.6],
      rot: [Math.PI / 2, 0, 0],
    }));
    return g;
  },
};

/* Centraliza e leva o maior lado a 1, para o fator de escala por comprimento
   valer igual para todas as classes. */
function normalizar(THREE, grupo) {
  const caixa = new THREE.Box3().setFromObject(grupo);
  const centro = caixa.getCenter(new THREE.Vector3());
  const tam = caixa.getSize(new THREE.Vector3());
  grupo.position.sub(centro);
  const maior = Math.max(tam.x, tam.y, tam.z) || 1;
  const embrulho = new THREE.Group();
  embrulho.add(grupo);
  /* A normalização fica guardada, não só aplicada: a animação de entrada
     escreve `scale` a cada quadro e apagaria esse fator, devolvendo o modelo
     ao tamanho bruto (o cruzador tem 5 unidades de cone e estourava o
     quadro). Quem anima multiplica por ela. */
  embrulho.userData.base = 1.9 / maior;
  embrulho.scale.setScalar(embrulho.userData.base);
  return embrulho;
}

/* Comprimento real → escala visual, em log. Linear faria o X-wing sumir ao
   lado de uma Death Star; aqui o intervalo inteiro cabe numa faixa legível. */
function escalaPorComprimento(metros) {
  if (metros === null || !Number.isFinite(metros) || metros <= 0) return 0.95;
  const t = Math.log10(Math.min(Math.max(metros, 1), 200000)) / Math.log10(200000);
  return 0.62 + t * 0.78;
}

function liberar(obj) {
  obj.traverse((n) => {
    if (n.geometry) n.geometry.dispose();
  });
}

/* ---------------- Renderer único ----------------
   Contexto WebGL é caro e o navegador limita quantos existem ao mesmo tempo.
   Como só há um painel de detalhe na tela, um renderer basta: o canvas é
   movido para o container da vez. */
let renderer = null;

/**
 * Cria o hangar dentro de `host`.
 * @returns {{mostrar:Function, destroy:Function}}
 */
export function criarHangar(host) {
  let vivo = true;
  let THREE = null;
  let cena = null;
  let camera = null;
  let atual = null;
  let entrando = null;
  let saindo = null;
  let luzAcento = null;
  let materiais = null;
  let inscricao = null;
  let observador = null;
  let visivel = true;

  /* x começa positivo: a câmera olha de CIMA, que é o ângulo em que um
     disco, uma cunha e um quadrúpede se distinguem. De perfil viram todos a
     mesma pilha de caixas. */
  const giro = { y: 0.6, x: 0.38, vy: 0.003, vx: 0, arrastando: false };
  let distancia = 3.9;
  let alvoDistancia = 3.9;

  const rotulo = document.createElement("span");
  rotulo.className = "hg-metros";
  rotulo.hidden = true;
  host.appendChild(rotulo);

  let pendente = null; /* seleção pedida antes de o THREE chegar */

  carregarThree()
    .then((lib) => {
      if (!vivo) return;
      THREE = lib;
      montar();
      if (pendente) aplicar(...pendente);
    })
    .catch(() => {
      /* silêncio: sem three.js o chamador mantém a silhueta SVG */
      host.classList.add("is-sem-3d");
    });

  function montar() {
    const acento = new THREE.Color(corDeAcento());

    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    }
    renderer.domElement.className = "hg-canvas";
    host.appendChild(renderer.domElement);

    cena = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

    materiais = {
      corpo: new THREE.MeshStandardMaterial({
        color: 0x9aa3ad,
        roughness: 0.6,
        metalness: 0.7,
        flatShading: true,
      }),
      aresta: new THREE.LineBasicMaterial({
        color: acento,
        transparent: true,
        opacity: 0.55,
      }),
    };

    cena.add(new THREE.HemisphereLight(0xdfe9ff, 0x0a0c10, 0.55));

    const sol = new THREE.DirectionalLight(0xffffff, 0.95);
    sol.position.set(2.5, 5, 3);
    cena.add(sol);

    /* a luz de baixo é o "clima" do hangar: contorna a nave por baixo na cor
       do tema e é ela que pisca no flash de troca */
    luzAcento = new THREE.PointLight(acento, 1.5, 14);
    luzAcento.position.set(0, -2.4, 1.2);
    cena.add(luzAcento);

    const grade = new THREE.GridHelper(9, 18, acento, acento);
    grade.material.transparent = true;
    grade.material.opacity = 0.16;
    grade.position.y = -1.5;
    cena.add(grade);

    ajustar();
    ligarPonteiro();

    observador = new IntersectionObserver(
      ([e]) => {
        visivel = e.isIntersecting;
        if (visivel) ligarLaco();
        else desligarLaco();
      },
      { threshold: 0.01 }
    );
    observador.observe(host);

    ligarLaco();

    /* Sonda de diagnóstico, no mesmo espírito de window.__codexLoop: é o que
       permite medir de fora se a geometria antiga está mesmo sendo
       descartada na troca, em vez de confiar na leitura do código. */
    window.__hangarInfo = () => {
      let malhas = 0;
      let vertices = 0;
      cena?.traverse((n) => {
        if (n.isMesh) {
          malhas += 1;
          vertices += n.geometry?.attributes?.position?.count || 0;
        }
      });
      return {
        malhas,
        vertices,
        objetosNaCena: cena ? cena.children.length : 0,
        geometriasNoRenderer: renderer?.info?.memory?.geometries ?? null,
        chamadas: renderer?.info?.render?.calls ?? null,
        pixelRatio: renderer?.getPixelRatio?.() ?? null,
        inscritoNoLaco: Boolean(inscricao),
        escalaAtual: atual ? +atual.scale.x.toFixed(3) : null,
        alvoDeEscala: atual?.userData.alvo ?? null,
        intensidadeAcento: luzAcento ? +luzAcento.intensity.toFixed(2) : null,
        entrando: Boolean(entrando),
        saindo: Boolean(saindo),
      };
    };
  }

  function ajustar() {
    const l = host.clientWidth || 300;
    const a = host.clientHeight || 260;
    renderer.setSize(l, a, false);
    camera.aspect = l / a;
    camera.updateProjectionMatrix();
  }

  /* ---------------- Interação ---------------- */
  function ligarPonteiro() {
    const cv = renderer.domElement;
    let ultimoX = 0;
    let ultimoY = 0;
    let capturado = 0;

    cv.addEventListener("pointerdown", (e) => {
      giro.arrastando = true;
      ultimoX = e.clientX;
      ultimoY = e.clientY;
      cv.classList.add("is-grabbing");
      try {
        cv.setPointerCapture(e.pointerId);
        capturado = e.pointerId;
      } catch (_) { /* segue sem captura */ }
    });

    cv.addEventListener("pointermove", (e) => {
      if (!giro.arrastando) return;
      const dx = e.clientX - ultimoX;
      const dy = e.clientY - ultimoY;
      ultimoX = e.clientX;
      ultimoY = e.clientY;
      giro.y += dx * 0.008;
      giro.x = Math.max(-1.1, Math.min(1.1, giro.x + dy * 0.006));
      giro.vy = Math.max(-0.12, Math.min(0.12, dx * 0.008));
      giro.vx = Math.max(-0.08, Math.min(0.08, dy * 0.006));
    });

    const fim = () => {
      if (!giro.arrastando) return;
      giro.arrastando = false;
      cv.classList.remove("is-grabbing");
      if (capturado && cv.hasPointerCapture?.(capturado)) {
        try { cv.releasePointerCapture(capturado); } catch (_) { /* já solto */ }
      }
      capturado = 0;
    };

    cv.addEventListener("pointerup", fim);
    cv.addEventListener("pointercancel", fim);

    cv.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        alvoDistancia = Math.max(2.4, Math.min(7, alvoDistancia + e.deltaY * 0.004));
      },
      { passive: false }
    );
  }

  /* ---------------- Laço ---------------- */
  function passo(dt) {
    if (!cena || !camera) return;
    const quadros = Math.min(dt * 60, 3);

    if (!giro.arrastando) {
      /* volta suave para a rotação de cruzeiro: é o que dá a inércia */
      giro.vy += (0.003 - giro.vy) * (1 - Math.pow(0.94, quadros));
      giro.vx += (0 - giro.vx) * (1 - Math.pow(0.9, quadros));
    }
    giro.y += giro.vy * quadros;
    giro.x = Math.max(-1.1, Math.min(1.1, giro.x + giro.vx * quadros));

    distancia += (alvoDistancia - distancia) * (1 - Math.pow(0.85, quadros));
    camera.position.set(0, Math.sin(giro.x) * distancia, Math.cos(giro.x) * distancia);
    camera.lookAt(0, 0, 0);

    if (atual) atual.rotation.y = giro.y;

    /* entrada e saída: escala animada por quadro, sem CSS no meio */
    if (saindo) {
      saindo.t -= dt * 5;
      const k = Math.max(0, saindo.t);
      saindo.obj.scale.setScalar(saindo.alvo * k * k);
      if (k <= 0) {
        cena.remove(saindo.obj);
        liberar(saindo.obj);
        saindo = null;
      }
    }

    if (entrando) {
      entrando.t = Math.min(1, entrando.t + dt * 3.3);
      const k = 1 - Math.pow(1 - entrando.t, 3);
      entrando.obj.scale.setScalar(entrando.alvo * k);
      entrando.obj.rotation.y = giro.y;
      if (luzAcento) luzAcento.intensity = 1.5 + (1 - entrando.t) * 5.5;
      if (entrando.t >= 1) {
        if (luzAcento) luzAcento.intensity = 1.5;
        entrando = null;
      }
    }

    renderer.render(cena, camera);
  }

  function ligarLaco() {
    if (inscricao || !cena) return;
    ajustar();
    inscricao = subscribe(passo);
  }

  function desligarLaco() {
    if (!inscricao) return;
    unsubscribe(passo);
    inscricao = null;
  }

  /* ---------------- API ---------------- */
  function aplicar(chave, metros, textoMetros) {
    if (!THREE || !cena) return;

    if (atual) {
      if (saindo) {
        cena.remove(saindo.obj);
        liberar(saindo.obj);
      }
      saindo = { obj: atual, alvo: atual.userData.alvo || 1, t: 1 };
      atual = null;
    }

    const montador = MODELOS[chave] || MODELOS.generico;
    const bruto = montador(THREE, materiais);
    const obj = normalizar(THREE, bruto);
    const alvo = obj.userData.base * escalaPorComprimento(metros);
    obj.userData.alvo = alvo;
    obj.scale.setScalar(0.001);
    cena.add(obj);

    atual = obj;
    entrando = { obj, alvo, t: 0 };

    rotulo.textContent = textoMetros || "";
    rotulo.hidden = !textoMetros;
  }

  return {
    mostrar(chave, metros, textoMetros) {
      if (!vivo) return;
      if (!THREE) {
        pendente = [chave, metros, textoMetros];
        return;
      }
      aplicar(chave, metros, textoMetros);
    },

    redimensionar() {
      if (cena) ajustar();
    },

    destroy() {
      vivo = false;
      desligarLaco();
      observador?.disconnect();
      if (cena) {
        if (atual) liberar(atual);
        if (saindo) liberar(saindo.obj);
        cena.traverse((n) => {
          if (n.geometry) n.geometry.dispose();
        });
      }
      materiais?.corpo.dispose();
      materiais?.aresta.dispose();
      /* o renderer é compartilhado: só devolvemos o canvas para fora do DOM */
      if (renderer?.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
      if (window.__hangarInfo) delete window.__hangarInfo;
      cena = null;
      camera = null;
      atual = null;
    },
  };
}
