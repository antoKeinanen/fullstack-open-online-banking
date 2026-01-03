FROM base AS builder

RUN pnpm build --filter=@repo/user-service

FROM golang:1.25-trixie AS runner

COPY --from=builder /app/src/services/user-service/build/app .

EXPOSE 50052

ENTRYPOINT [ "/go/app" ]
