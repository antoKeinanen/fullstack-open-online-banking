import { Hono } from "hono";
import { faker } from "@faker-js/faker";
import { UserService } from "./UserService";
import z from "zod";
import {
  describeRoute,
  openAPIRouteHandler,
  resolver,
  validator,
} from "hono-openapi";
import { logger } from "hono/logger";

const userService = new UserService("localhost:50052");

const app = new Hono();
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

const userSchema = z.object({
  userId: z.string(),
  phoneNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  address: z.string(),
  createdAt: z.iso.time(),
});

const getAllUsersRequestSchema = z.object({
  offset: z.coerce.number().default(0),
  take: z.coerce.number().default(100),
});

const getAllUsersResponseSchema = z.object({
  users: z.array(userSchema),
  count: z.number(),
});

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
    },
  }),
  validator("query", getAllUsersRequestSchema),
  async (c) => {
    const query = c.req.valid("query");

    const users = await userService.getUserPaginated(query);
    if (users.error != null) {
      console.log("Failed to get paginated users:", users.error.details);
      return c.text("Unknown error", 500);
      return c.json(users.data);
    }
    return c.json(users);
  }
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
    },
  }),
  async (c) => {
    const userId = c.req.param("userId");
    const user = await userService.getUserById({ userId });
    if (user.error != null) {
      if (user.error.details == "user_not_found") {
        return c.text("Not found", 404);
      }
      console.log("Failed to get user by id:", user.error.details);
      return c.text("Unknown error", 500);
    }

    return c.json(user.data);
  }
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
    })
  );
}

export default app;
