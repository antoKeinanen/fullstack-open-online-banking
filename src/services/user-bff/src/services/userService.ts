import { UserService } from "@repo/service-bindings/user-service";

import { env } from "../env";

export const userService = new UserService(env.USER_BFF_USER_SERVICE_URL);
