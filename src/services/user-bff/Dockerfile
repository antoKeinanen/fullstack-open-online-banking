FROM base AS builder

RUN pnpm build --filter=@repo/user-bff

FROM oven/bun:1 AS runner

ENV NODE_ENV="production"
ENV USER_BFF_PORT="3002"

COPY --from=builder /app/src/services/user-bff/build/index.js .

EXPOSE 3002

ENTRYPOINT [ "bun", "index.js" ]
