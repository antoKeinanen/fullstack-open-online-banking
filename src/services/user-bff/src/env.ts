import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    USER_BFF_PORT: z.number().gt(0),
    USER_BFF_USER_SERVICE_URL: z.url(),
  },
  runtimeEnv: Bun.env,
  emptyStringAsUndefined: true,
});
