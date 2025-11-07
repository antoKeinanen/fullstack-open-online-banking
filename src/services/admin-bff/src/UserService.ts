import {
  CreateUserRequest,
  GetUserByIdRequest,
  GetUsersPaginatedRequest,
  GetUsersPaginatedResponse,
  User,
  UserServiceClient,
} from "@repo/protobufs/user-service";
import * as grpc from "@grpc/grpc-js";
import { promisify } from "util";
import { Result, tryCatch } from "./try-catch";

export class UserService {
  private client: UserServiceClient;

  constructor(address: string) {
    this.client = new UserServiceClient(
      address,
      grpc.credentials.createInsecure()
    );

    console.log("Connecting to user service grpc");
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 5);
    this.client.waitForReady(deadline, (error) => {
      if (error != undefined) {
        console.error("Failed to connect grpc", error);
        throw new Error("Failed to connect to grpc");
      }
    });
    console.log("Connected to user service grpc");
  }

  async createUser(
    request: CreateUserRequest
  ): Promise<Result<User, grpc.ServiceError>> {
    const createUser = promisify(this.client.createUser.bind(this.client));
    return tryCatch(createUser(request)) as Promise<
      Result<User, grpc.ServiceError>
    >;
  }

  async getUserById(
    request: GetUserByIdRequest
  ): Promise<Result<User, grpc.ServiceError>> {
    const getUserById = promisify(this.client.getUserById.bind(this.client));
    return tryCatch(getUserById(request)) as Promise<
      Result<User, grpc.ServiceError>
    >;
  }

  async getUserPaginated(
    request: GetUsersPaginatedRequest
  ): Promise<Result<GetUsersPaginatedResponse, grpc.ServiceError>> {
    const getUsersPaginated = promisify(
      this.client.getUsersPaginated.bind(this.client)
    );

    return tryCatch(getUsersPaginated(request)) as Promise<
      Result<GetUsersPaginatedResponse, grpc.ServiceError>
    >;
  }
}
