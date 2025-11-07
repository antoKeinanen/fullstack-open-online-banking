import {
  CreateUserRequest,
  User,
  UserServiceClient,
} from "@repo/protobufs/user-service";
import * as grpc from "@grpc/grpc-js";
import { promisify } from "util";

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

  async createUser(request: CreateUserRequest): Promise<User> {
    const createUser = promisify(this.client.createUser.bind(this.client));
    return createUser(request) as Promise<User>;
  }
}
