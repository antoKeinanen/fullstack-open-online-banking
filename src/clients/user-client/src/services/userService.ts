import { userSchema } from "@repo/validators/user";

import * as api from "../util/api";

export async function getUserDetails() {
  return api.get("/api/user", userSchema);
}
