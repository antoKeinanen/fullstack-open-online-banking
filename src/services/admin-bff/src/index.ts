import { faker } from "@faker-js/faker";
import { Hono } from "hono";
import {
  describeRoute,
  openAPIRouteHandler,
  resolver,
  validator,
} from "hono-openapi";
import { logger } from "hono/logger";

import {
  createUserRequestSchema,
  createUserResponseSchema,
  getAllUsersRequestSchema,
  getAllUsersResponseSchema,
  userSchema,
} from "@repo/validators/user";

import { UserService } from "./UserService";

const userService = new UserService("localhost:50052");

const app = new Hono().basePath("/api");
app.use(logger());

app.get("/create_user", async (c) => {
  const user = await userService.createUser({
    address: faker.location.streetAddress(true),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phoneNumber: faker.phone.number({ style: "international" }),
  });

  return c.json(user);
});

app.post(
  "/users",
  describeRoute({
    description: "Creates a new user",
    responses: {
      201: {
        description: "Successfully created",
        content: {
          "application/json": { schema: resolver(createUserResponseSchema) },
        },
      },
      500: {
        description:
          "Something has gone wrong, retry and backoff if error persists",
        content: {
          "text/plain": {
            example: "Unknown error",
          },
        },
      },
    },
  }),
  validator("json", createUserRequestSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const { data: userData, error: userError } =
      await userService.createUser(payload);
    if (userError != null) {
      return c.text("Unknown error", 500);
    }

    return c.json(userData, 201);
  },
);

app.get(
  "/users",
  describeRoute({
    description: "Get paginated list of all users",
    responses: {
      200: {
        description: "Successful response",
        content: {
          "application/json": { schema: resolver(getAllUsersResponseSchema) },
        },
      },
      500: {
        description:
          "Something has gone wrong, retry and backoff if error persists",
        content: {
          "text/plain": {
            example: "Unknown error",
          },
        },
      },
    },
  }),
  validator("query", getAllUsersRequestSchema),
  async (c) => {
    const query = c.req.valid("query");

    const { data: users, error: usersError } =
      await userService.getUserPaginated(query);
    if (usersError != null) {
      console.log("Failed to get paginated users:", usersError.details);
      return c.text("Unknown error", 500);
    }
    return c.json(users);
  },
);

app.get(
  "/users/:userId",
  describeRoute({
    description: "Get a single user with user id",
    responses: {
      200: {
        description: "Successful response",
        content: {
          "application/json": { schema: resolver(userSchema) },
        },
      },
      500: {
        description:
          "Something has gone wrong, retry and backoff if error persists",
        content: {
          "text/plain": {
            example: "Unknown error",
          },
        },
      },
      404: {
        description: "User you have request was not found",
        content: {
          "text/plain": {
            example: "Not found",
          },
        },
      },
    },
  }),
  async (c) => {
    const userId = c.req.param("userId");
    const { data: user, error: userError } = await userService.getUserById({
      userId,
    });
    if (userError != null) {
      if (userError.details == "user_not_found") {
        return c.text("Not found", 404);
      }
      console.log(userError.cause, userError.message);
      return c.text("Unknown error", 500);
    }

    return c.json(user);
  },
);

if (Bun.env.NODE_ENV != "production") {
  app.get(
    "/openapi",
    openAPIRouteHandler(app, {
      documentation: {
        info: {
          title: "Admin bff",
          version: "0.0.0",
          description: "Administrative backend for frontend",
        },
        servers: [],
      },
    }),
  );
}

export default app;
