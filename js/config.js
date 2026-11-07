/* Configuração do front.
   ------------------------------------------------------------------
   Este arquivo é servido ao navegador como qualquer outro .js, então o
   que estiver aqui é público por definição. Só entra aqui chave de API
   pública, de uso em cliente — nada de segredo de servidor.

   TMDB_API_KEY: chave v3 da API do The Movie Database, usada só para
   buscar o pôster oficial que entra de fundo no cabeçalho do modal de
   Filmes. Pegue a sua em https://www.themoviedb.org/settings/api e cole
   entre as aspas.

   Com a chave vazia o app funciona igual: a busca nem é disparada e o
   cabeçalho fica com o visual padrão. */
export const TMDB_API_KEY = "";

export const TMDB_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

/* SUPABASE_URL / SUPABASE_ANON_KEY: projeto do Supabase usado SÓ pelo modo
   online do Super Trunfo ("Online (dois aparelhos)"). O projeto não tem
   tabela nenhuma: só o Realtime (broadcast + presença) repassa as jogadas
   entre os dois aparelhos.

   A anon key é pública por definição — é a chave que o Supabase entrega
   para uso em navegador. Com o projeto sem tabelas, ela não dá acesso a
   dado nenhum; só deixa entrar num canal do Realtime.

   Com qualquer um dos dois vazio, o botão do modo online nem aparece e
   nada tenta se conectar. */
export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";
