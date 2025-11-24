import axios from "axios";
import type {AxiosRequestConfig} from "axios";
import type {z} from "zod";

type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

async function request<T extends z.ZodTypeAny>(
  method: HttpMethod,
  url: string,
  schema: T,
  data?: unknown
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

  const parsedData = schema.safeParse(response.data);

  if (!parsedData.success) {
    console.error(
      "Failed to parse server response:",
      parsedData.error,
      response.data
    );
    throw new Error("Failed to parse response");
  }

  return parsedData.data;
}

export function get<T extends z.ZodTypeAny>(url: string, schema: T) {
  return request("get", url, schema);
}

export function post<T extends z.ZodTypeAny>(
  url: string,
  schema: T,
  data?: unknown
) {
  return request("post", url, schema, data);
}

export function put<T extends z.ZodTypeAny>(
  url: string,
  schema: T,
  data?: unknown
) {
  return request("put", url, schema, data);
}

export function del<T extends z.ZodTypeAny>(
  url: string,
  schema: T,
  data?: unknown
) {
  return request("delete", url, schema, data);
}

export function patch<T extends z.ZodTypeAny>(
  url: string,
  schema: T,
  data?: unknown
) {
  return request("patch", url, schema, data);
}
