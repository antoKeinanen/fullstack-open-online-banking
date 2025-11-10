import * as api from "../util/server";
import {
  createUserResponseSchema,
  getAllUsersResponseSchema,
  getUserResponseSchema,
  type CreateUserRequest,
  type CreateUserResponse,
  type GetUserRequest,
  type GetUserResponse,
} from "@repo/validators/user";

export async function getAllUsersPaginated() {
  return api.get("/api/users", getAllUsersResponseSchema);
}

export async function createUser(
  request: CreateUserRequest
): Promise<CreateUserResponse> {
  return api.post("/api/users", createUserResponseSchema, request);
}

export async function getUser(
  request: GetUserRequest
): Promise<GetUserResponse> {
  return api.get(`/api/users/${request.userId}`, getUserResponseSchema);
}
