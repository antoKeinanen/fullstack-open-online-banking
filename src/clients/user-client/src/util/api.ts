import type { AxiosRequestConfig } from "axios";
import type { z } from "zod";
import axios from "axios";
import createAuthRefreshInterceptor from "axios-auth-refresh";

import { sessionSchema } from "@repo/validators/user";

import { useAuthStore } from "../stores/authStore";

type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

async function request<T extends z.ZodTypeAny>(
  method: HttpMethod,
  url: string,
  schema: T,
  data?: unknown,
): Promise<z.infer<T>> {
  const config: AxiosRequestConfig = {
    method,
    url,
    headers: {
      "Content-Type": "application/json",
    },
    data: data ?? {},
  };

  const response = await axios.request(config);
  const validated = schema.parse(response.data);
  return validated;
}

export function get<T extends z.ZodTypeAny>(url: string, schema: T) {
  return request("get", url, schema);
}

export function post<T extends z.ZodTypeAny>(
  url: string,
  schema: T,
  data?: unknown,
) {
  return request("post", url, schema, data);
}

export function put<T extends z.ZodTypeAny>(
  url: string,
  schema: T,
  data?: unknown,
) {
  return request("put", url, schema, data);
}

export function del<T extends z.ZodTypeAny>(
  url: string,
  schema: T,
  data?: unknown,
) {
  return request("delete", url, schema, data);
}

export function patch<T extends z.ZodTypeAny>(
  url: string,
  schema: T,
  data?: unknown,
) {
  return request("patch", url, schema, data);
}

axios.interceptors.request.use((request) => {
  const { isAuthenticated, session } = useAuthStore.getState();

  if (!isAuthenticated()) return request;
  request.headers.setAuthorization("Bearer " + session?.accessToken);

  return request;
});

async function refreshToken(_failedRequest: unknown) {
  console.info("Refreshing tokens");
  const response = await axios.post("/api/auth/refresh-tokens");
  const parsed = sessionSchema.parse(response.data);

  const { setSession } = useAuthStore.getState();
  setSession(parsed);

  console.log("Tokens refreshed");

  return Promise.resolve();
}

createAuthRefreshInterceptor(axios, refreshToken);
