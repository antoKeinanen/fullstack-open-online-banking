import { createFileRoute } from "@tanstack/react-router";

import { CreateUserModal } from "../components/createUserModal";
import { UserTable } from "../components/usersTable";

export const Route = createFileRoute("/users")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <CreateUserModal />
      <UserTable />
    </div>
  );
}
