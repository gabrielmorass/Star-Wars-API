/* ---------------- Avatares e retratos ----------------
   Cache e desenho de retrato, usados pela grade de Personagens, pela linha
   do tempo, pelas conexões do modal de personagem e pela aba Elenco do
   modal de Filmes.

   Mora aqui, e não dentro de people/view.js, porque o cache só cumpre o
   papel dele se for o MESMO para todas essas telas: um veredito por URL,
   válido enquanto a página estiver aberta. Foi o que resolveu os
   mini-avatares que caíam em iniciais mesmo com o card mostrando a foto. */

export function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/* Matiz derivada do nome: cada personagem sem foto ganha sempre o mesmo
   gradiente, e nunca aparece o ícone de imagem quebrada. */
function hueOf(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export function avatarStyle(name) {
  const h = hueOf(name);
  return `--a1: hsl(${h} 62% 52%); --a2: hsl(${(h + 48) % 360} 58% 34%)`;
}

/* Tempo máximo que esperamos por um retrato antes de desistir dele.
   Boa parte das URLs do dataset aponta para o domínio antigo da Fandom e
   hoje responde 403 (ou simplesmente pendura), então sem um teto a imagem
   ficava para sempre no estado "carregando" — o quadrado cinza com ícone
   de foto que aparecia em uns 25 cards. */
const FOTO_TIMEOUT = 4000;

/* A Fandom não devolve 404 para imagem inexistente: responde 200 com um PNG
   de "imagem não encontrada" — o quadrado cinza com ícone de foto. Ele chega
   sempre com exatamente 300×171, e como é uma imagem válida nenhum `error`
   dispara. Era a causa de 13 cards continuarem com o ícone genérico mesmo
   depois de validarmos naturalWidth. */
const PLACEHOLDER = { largura: 300, altura: 171 };

function ehImagemUtil(img) {
  if (img.naturalWidth < 64 || img.naturalHeight < 64) return false;
  return !(img.naturalWidth === PLACEHOLDER.largura && img.naturalHeight === PLACEHOLDER.altura);
}

/* ---------- Veredito de retrato, decidido uma vez por URL ----------
   Sem cache, cada tela repetia a validação inteira (requisição + timeout de
   4s) e, pior, a decisão podia sair diferente: quem já estava no cache do
   navegador resolvia de forma SÍNCRONA, antes de o mini-avatar ter sido
   inserido no documento, e era descartado. */
const cacheFoto = new Map();

export function resolverFoto(url) {
  if (!url || typeof url !== "string" || !url.trim()) return Promise.resolve(null);
  if (cacheFoto.has(url)) return cacheFoto.get(url);

  const promessa = new Promise((resolve) => {
    const img = new Image();
    let decidido = false;

    const decidir = (ok) => {
      if (decidido) return;
      decidido = true;
      clearTimeout(prazo);
      resolve(ok ? url : null);
    };

    /* onload sozinho não basta: uma resposta de erro também dispara load, e
       só as dimensões revelam se veio retrato ou o placeholder da Fandom */
    const julgar = () => decidir(img.naturalWidth > 0 && img.naturalHeight > 0 && ehImagemUtil(img));

    const prazo = setTimeout(() => decidir(false), FOTO_TIMEOUT);
    img.addEventListener("load", julgar, { once: true });
    img.addEventListener("error", () => decidir(false), { once: true });
    img.src = url;
    if (img.complete) julgar();
  });

  cacheFoto.set(url, promessa);
  return promessa;
}

/* Coloca o retrato no lugar do avatar de iniciais — e só se ele for uma
   imagem de verdade. Nunca existe <img> sem imagem válida no documento. */
export function carregarFoto(wrap, url) {
  return resolverFoto(url).then((valida) => {
    if (!valida || wrap.querySelector(".person-photo")) return false;
    const img = document.createElement("img");
    img.className = "person-photo";
    img.alt = "";
    img.src = valida;
    wrap.appendChild(img);
    wrap.querySelector(".person-avatar-fallback")?.classList.add("is-hidden");
    return true;
  });
}

/* Um avatar pequeno reaproveitado pela linha do tempo, pelas conexões do
   modal de personagem e pelo elenco do modal de filme */
export function miniAvatar(pessoa, tamanho, portraits, extraClasse = "") {
  const el = document.createElement("span");
  el.className = `mini-avatar ${extraClasse}`.trim();
  /* decorativo: quem nomeia é o aria-label do botão ou o texto ao lado —
     sem isso o leitor de tela anunciaria as iniciais antes do nome */
  el.setAttribute("aria-hidden", "true");
  el.style.width = `${tamanho}px`;
  el.style.height = `${tamanho}px`;
  const ini = document.createElement("span");
  ini.className = "person-avatar-fallback";
  ini.setAttribute("style", avatarStyle(pessoa.name));
  ini.textContent = initials(pessoa.name);
  el.appendChild(ini);
  carregarFoto(el, portraits.get(pessoa.name.trim().toLowerCase()));
  return el;
}

/* ---------- Cor por espécie ----------
   A SWAPI grafa "Wookie" (sem o segundo "e"); as duas formas apontam para a
   mesma cor. */
const SPECIES_COLORS = {
  Human: "#f2c94c",
  Droid: "#00d4ff",
  Wookie: "#8b5a2b",
  Wookiee: "#8b5a2b",
};

export const OTHER_SPECIES_COLOR = "#9b51e0";

export function speciesColor(name) {
  return SPECIES_COLORS[name] || OTHER_SPECIES_COLOR;
}
