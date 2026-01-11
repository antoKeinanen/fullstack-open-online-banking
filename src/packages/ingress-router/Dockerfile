FROM nginx:1.29.3 AS runner

COPY /src/packages/ingress-router/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

ENTRYPOINT ["nginx", "-g", "daemon off;"]