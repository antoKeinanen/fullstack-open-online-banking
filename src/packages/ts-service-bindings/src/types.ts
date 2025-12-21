import type { ServiceError } from "@grpc/grpc-js";

import type { Result } from "./try-catch";

export type GrpcResponse<T> = Promise<Result<T, ServiceError>>;
