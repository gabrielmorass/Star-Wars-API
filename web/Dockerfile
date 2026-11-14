# Imagem oficial com versão fixa para builds reproduzíveis.
FROM nginx:1.27.5-alpine

# Remove o site padrão para servir somente a aplicação deste projeto.
RUN rm -f /etc/nginx/conf.d/default.conf

# Copia apenas os arquivos estáticos usados pelo site em tempo de execução.
COPY index.html /usr/share/nginx/html/index.html
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY public/favicon.svg /usr/share/nginx/html/public/favicon.svg
COPY src/data/planets-map.json /usr/share/nginx/html/src/data/planets-map.json
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

# Expõe HTTP e permite ao Docker verificar que o Nginx serve a página.
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
