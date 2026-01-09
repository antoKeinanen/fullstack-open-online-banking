import type { Metadata, ServiceError } from "@grpc/grpc-js";

import type { Result } from "./try-catch";

export type GrpcResponse<T> = Promise<Result<T, ServiceError>>;

type GrpcUnaryMethod<TRequest, TResponse> = (
  request: TRequest,
  metadata: Metadata,
  callback: (error: ServiceError | null, response: TResponse) => void,
) => void;

export function promisifyGrpc<TRequest, TResponse>(
  method: GrpcUnaryMethod<TRequest, TResponse>,
): (request: TRequest, metadata: Metadata) => Promise<TResponse> {
  return (request: TRequest, metadata: Metadata): Promise<TResponse> => {
    return new Promise((resolve, reject) => {
      method(request, metadata, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  };
}
