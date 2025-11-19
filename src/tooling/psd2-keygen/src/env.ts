import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    OP_KEYGEN_CERTIFICATE_API_URL: z.url(),
    OP_KEYGEN_COUNTRY: z.string().uppercase().length(2).default("FI"),
    OP_KEYGEN_COMMON_NAME: z.string(),
    OP_KEYGEN_API_KEY: z.string(),
    OP_KEYGEN_PRIVATE_JWKS_PATH: z
      .string()
      .default("./keys/op/privateJwks.json"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
