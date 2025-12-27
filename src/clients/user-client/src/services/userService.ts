import type { GetUserTransfersRequest } from "@repo/validators/user";
import {
  getUserTransfersResponseSchema,
  userSchema,
} from "@repo/validators/user";

import * as api from "../util/api";

export async function getUserDetails() {
  return api.get("/api/user", userSchema);
}

export async function getUserTransfers(req: GetUserTransfersRequest) {
  const query = new URLSearchParams();

  Object.entries(req).forEach(([key, value]) => {
    query.append(key, String(value));
  });

  return api.get(
    "/api/user/transfers?" + query.toString(),
    getUserTransfersResponseSchema,
  );
}
