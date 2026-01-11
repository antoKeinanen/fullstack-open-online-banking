import type { SignatureAlgorithm } from "hono/utils/jwt/jwa";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    USER_BFF_PORT: z
      .string()
      .regex(/^[0-9]+$/)
      .transform((s) => Number.parseInt(s)),
    USER_BFF_USER_SERVICE_URL: z
      .url()
      .transform((url) => new URL(url).host),
    USER_BFF_PAYMENT_SERVICE_URL: z
      .url()
      .transform((url) => new URL(url).host),
    USER_BFF_JWT_SECRET: z.string(),
    USER_BFF_REDIS_CONNECTION_STRING: z.string(),
    USER_BFF_STRIPE_SECRET_KEY: z.string(),
    USER_BFF_BASE_URL: z.string(),
    USER_BFF_STRIPE_SERVICE_URL: z
      .url()
      .transform((url) => new URL(url).host),
    USER_BFF_STRIPE_WEBHOOK_SECRET: z.string(),
    USER_BFF_OTEL_EXPORTER_OTLP_ENDPOINT: z.string(),
    NODE_ENV: z.enum(["development", "production"]),
    USER_BFF_JWT_ALG: z
      .enum([
        "HS256",
        "HS384",
        "HS512",
        "RS256",
        "RS384",
        "RS512",
        "ES256",
        "ES384",
        "ES512",
        "PS256",
        "PS384",
        "PS512",
      ] satisfies SignatureAlgorithm[])
      .default("HS256"),
  },
  runtimeEnv: Bun.env,
  emptyStringAsUndefined: true,
});
