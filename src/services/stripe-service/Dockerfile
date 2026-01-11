FROM base AS builder

RUN pnpm build --filter=@repo/stripe-service

FROM golang:1.25-trixie AS runner

ENV NODE_ENV="production"
ENV STRIPE_SERVICE_PORT="50054"

COPY --from=builder /app/src/services/stripe-service/build/app .

EXPOSE 50054

ENTRYPOINT [ "/go/app" ]
