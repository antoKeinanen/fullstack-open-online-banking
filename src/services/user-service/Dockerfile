FROM base AS builder

RUN pnpm build --filter=@repo/user-service

FROM golang:1.25-trixie AS runner

ENV NODE_ENV="production"
ENV USER_SERVICE_PORT="50052"

COPY --from=builder /app/src/services/user-service/build/app .

EXPOSE 50052

ENTRYPOINT [ "/go/app" ]
