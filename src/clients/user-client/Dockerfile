FROM base AS builder

RUN pnpm build --filter=@repo/user-client

FROM nginx:1.29.3 AS runner

COPY --from=builder /app/src/clients/user-client/nginx.conf /etc/nginx/nginx.conf


COPY --from=builder /app/src/clients/user-client/dist/ /usr/share/nginx/html


EXPOSE 80

ENTRYPOINT ["nginx", "-g", "daemon off;"]