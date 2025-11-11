FROM base AS builder

RUN pnpm build --filter=@repo/admin-client

FROM nginx:1.29.3 AS runner

COPY --from=builder /app/src/clients/admin-client/nginx.conf /etc/nginx/nginx.conf


COPY --from=builder /app/src/clients/admin-client/dist/ /usr/share/nginx/html


EXPOSE 80

ENTRYPOINT ["nginx", "-g", "daemon off;"]
