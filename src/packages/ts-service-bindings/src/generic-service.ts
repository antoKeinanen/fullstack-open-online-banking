import * as grpc from "@grpc/grpc-js";
import { context, propagation } from "@opentelemetry/api";

import type { GrpcResponse } from "./types";
import { tryCatch } from "./try-catch";

export type GrpcClientConstructor<T extends grpc.Client> = new (
  address: string,
  credentials: grpc.ChannelCredentials,
  options?: Partial<grpc.ClientOptions>,
) => T;

type ExtractMethodTypes<T> = T extends {
  (
    request: infer Req,
    metadata: grpc.Metadata,
    options: Partial<grpc.CallOptions>,
    callback: (error: grpc.ServiceError | null, response: infer Res) => void,
  ): grpc.ClientUnaryCall;
  (
    request: infer Req2,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: infer Res2) => void,
  ): grpc.ClientUnaryCall;
  (
    request: infer Req3,
    callback: (error: grpc.ServiceError | null, response: infer Res3) => void,
  ): grpc.ClientUnaryCall;
}
  ? { request: Req & Req2 & Req3; response: Res & Res2 & Res3 }
  : never;

export type GrpcMethods<T extends grpc.Client> = {
  [K in keyof T]: ExtractMethodTypes<T[K]>;
};

type FilterNever<T> = {
  [K in keyof T as T[K] extends never ? never : K]: T[K];
};

type ExtractGrpcMethods<T extends grpc.Client> = FilterNever<GrpcMethods<T>>;

export class GrpcService<T extends grpc.Client> {
  private client: T;

  private constructor(client: T) {
    this.client = client;
  }

  static async create<T extends grpc.Client>(
    ClientConstructor: GrpcClientConstructor<T>,
    address: string,
    serviceName: string,
    options?: {
      credentials?: grpc.ChannelCredentials;
      connectionTimeoutSeconds?: number;
    },
  ) {
    const credentials =
      options?.credentials ?? grpc.credentials.createInsecure();
    const client = new ClientConstructor(address, credentials);

    const connectionTimeoutSeconds = options?.connectionTimeoutSeconds ?? 5;
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + connectionTimeoutSeconds);

    console.log(
      `[${serviceName}] Connecting to gRPC service at ${address} (timeout: ${connectionTimeoutSeconds}s, deadline: ${deadline.toISOString()})`,
    );

    await new Promise<void>((resolve, reject) => {
      client.waitForReady(deadline, (error) => {
        if (error != undefined) {
          console.error(
            `[${serviceName}] Failed to connect to gRPC service at ${address}`,
            {
              error: error.message,
              deadline: deadline.toISOString(),
              timeoutSeconds: connectionTimeoutSeconds,
            },
          );
          reject(
            new Error(
              `Failed to connect to ${serviceName} gRPC at ${address}: ${error.message}`,
            ),
          );
          return;
        }
        console.log(
          `[${serviceName}] Successfully connected to gRPC service at ${address}`,
        );
        resolve();
      });
    });

    return new GrpcService(client);
  }

  private injectContext(): grpc.Metadata {
    const metadata = new grpc.Metadata();
    const carrier: Record<string, string> = {};

    propagation.inject(context.active(), carrier);

    Object.entries(carrier).forEach(([key, value]) => {
      metadata.set(key, value);
    });

    return metadata;
  }

  async call<M extends keyof ExtractGrpcMethods<T> & string>(
    method: M,
    request: ExtractGrpcMethods<T>[M] extends { request: infer Req }
      ? Req
      : never,
  ): GrpcResponse<
    ExtractGrpcMethods<T>[M] extends { response: infer Res } ? Res : never
  > {
    return context.with(context.active(), async () => {
      const metadata = this.injectContext();

      const grpcMethod = this.client[method as keyof T];

      if (typeof grpcMethod !== "function") {
        throw new Error(`Method ${method} does not exist on client`);
      }

      const promisified = new Promise<
        ExtractGrpcMethods<T>[M] extends { response: infer Res } ? Res : never
      >((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
        (grpcMethod as Function).call(
          this.client,
          request,
          metadata,
          (
            error: grpc.ServiceError | null,
            response: ExtractGrpcMethods<T>[M] extends { response: infer Res }
              ? Res
              : never,
          ) => {
            if (error) {
              reject(error);
            } else {
              resolve(response);
            }
          },
        );
      });

      return tryCatch(promisified) as GrpcResponse<
        ExtractGrpcMethods<T>[M] extends { response: infer Res } ? Res : never
      >;
    });
  }

  getClient(): T {
    return this.client;
  }

  close(): void {
    this.client.close();
  }
}
