import { Hono } from "hono";
import { faker } from "@faker-js/faker";
import { UserService } from "./UserService";

const userService = new UserService("localhost:50052");

const app = new Hono();

app.get("/create_user", async (c) => {
  const user = await userService.createUser({
    address: faker.location.streetAddress(true),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phoneNumber: faker.phone.number({ style: "international" }),
  });

  return c.json(user);
});

export default app;
