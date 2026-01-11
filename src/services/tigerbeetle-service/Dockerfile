FROM base AS builder

RUN pnpm build --filter=@repo/tigerbeetle-service

FROM golang:1.25-trixie AS runner

ENV NODE_ENV="production"
ENV TIGERBEETLE_SERVICE_PORT="50051"

COPY --from=builder /app/src/services/tigerbeetle-service/build/app .

EXPOSE 50051

ENTRYPOINT [ "/go/app" ]
