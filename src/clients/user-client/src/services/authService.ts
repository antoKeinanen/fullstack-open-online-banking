import z from "zod";

import type {
  CreateUserRequest,
  OTPAuthenticationRequest,
  RequestAuthenticationRequest,
} from "@repo/validators/user";
import { sessionSchema } from "@repo/validators/user";

import * as api from "../util/api";

export function requestAuthentication(request: RequestAuthenticationRequest) {
  return api.post("/api/auth/request-authentication", z.any(), request);
}

export function authenticateWithOtp(request: OTPAuthenticationRequest) {
  return api.post("/api/auth/authenticate-with-otp", sessionSchema, request);
}

export function signUp(request: CreateUserRequest) {
  return api.post("/api/auth/sign-up", z.string(), request);
}
