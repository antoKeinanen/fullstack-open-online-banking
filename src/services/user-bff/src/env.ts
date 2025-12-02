import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    USER_BFF_PORT: z
      .string()
      .regex(/^[0-9]+$/)
      .transform((s) => Number.parseInt(s)),
    USER_BFF_USER_SERVICE_URL: z.url(),
  },
  runtimeEnv: Bun.env,
  emptyStringAsUndefined: true,
});
