import z from "zod";

import type {
  CreateUserRequest,
  InvalidateSessionRequest,
  OTPAuthenticationRequest,
  RequestAuthenticationRequest,
} from "@repo/validators/user";
import {
  getActiveSessionsResponseSchema,
  sessionSchema,
} from "@repo/validators/user";

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

export function getActiveSessions() {
  return api.get("/api/auth/sessions", getActiveSessionsResponseSchema);
}

export function invalidateSession(request: InvalidateSessionRequest) {
  return api.del("/api/auth/sessions", z.any(), request);
}

export function logOut() {
  return api.post("/api/auth/logout", z.any());
}
