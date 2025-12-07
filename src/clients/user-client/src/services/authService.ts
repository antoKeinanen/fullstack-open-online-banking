import z from "zod";

import type {
  CreateUserRequest,
  OTPAuthenticationRequest,
  RequestAuthenticationRequest,
} from "@repo/validators/user";
import { sessionSchema } from "@repo/validators/user";

import * as api from "../util/api";

export function requestAuthentication(request: RequestAuthenticationRequest) {
  const params = new URLSearchParams(request);
  const url = `/api/auth/request-authentication?${params.toString()}`;
  return api.post(url, z.any());
}

export function authenticateWithOtp(request: OTPAuthenticationRequest) {
  const params = new URLSearchParams(request);
  const url = `/api/auth/authenticate-with-otp?${params.toString()}`;

  return api.post(url, sessionSchema);
}

export function signUp(request: CreateUserRequest) {
  return api.post("/api/auth/sign-up", z.string(), request);
}
