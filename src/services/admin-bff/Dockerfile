FROM base AS builder

RUN pnpm build --filter=@repo/admin-bff

FROM oven/bun:1 AS runner

COPY --from=builder /app/src/services/admin-bff/build/index.js .

EXPOSE 3000

ENTRYPOINT [ "bun", "index.js" ]

