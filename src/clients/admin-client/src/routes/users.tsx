import { createFileRoute } from "@tanstack/react-router";
import { UserTable } from "../components/usersTable";
import { CreateUserModal } from "../components/createUserModal";

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
