/* Intenção de navegação entre views.

   Quando uma view quer abrir outra já com um item selecionado (o modal de
   Personagens leva para a nave que a pessoa pilota, ou para o planeta natal
   no mapa), ela deixa a intenção aqui e chama a navegação normal. A view de
   destino consome a intenção ao montar.

   É de uso único de propósito: ao ser lida, some. Assim, voltar para a view
   depois, pela navegação normal, não repete a seleção. */

const intents = new Map();

export function setIntent(view, payload) {
  intents.set(view, payload);
}

export function takeIntent(view) {
  const payload = intents.get(view);
  intents.delete(view);
  return payload;
}
