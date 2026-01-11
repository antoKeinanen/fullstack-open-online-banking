FROM base AS builder

RUN pnpm build --filter=@repo/payment-service

FROM golang:1.25-trixie AS runner

ENV NODE_ENV="production"
ENV PAYMENT_SERVICE_PORT="50053"

COPY --from=builder /app/src/services/payment-service/build/app .

EXPOSE 50053

ENTRYPOINT [ "/go/app" ]
