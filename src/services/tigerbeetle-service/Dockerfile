FROM base AS builder

RUN pnpm build --filter=@repo/tigerbeetle-service

FROM golang:1.25-trixie AS runner

COPY --from=builder /app/src/services/tigerbeetle-service/build/app .

EXPOSE 50051

ENTRYPOINT [ "/go/app" ]
