import type {
  CreateUserRequest,
  CreateUserResponse,
  GetUserRequest,
  GetUserResponse,
} from "@repo/validators/user";
import {
  createUserResponseSchema,
  getAllUsersResponseSchema,
  getUserResponseSchema,
} from "@repo/validators/user";

import * as api from "../util/server";

export async function getAllUsersPaginated() {
  return api.get("/api/users", getAllUsersResponseSchema);
}

export async function createUser(
  request: CreateUserRequest,
): Promise<CreateUserResponse> {
  return api.post("/api/users", createUserResponseSchema, request);
}

export async function getUser(
  request: GetUserRequest,
): Promise<GetUserResponse> {
  return api.get(`/api/users/${request.userId}`, getUserResponseSchema);
}
