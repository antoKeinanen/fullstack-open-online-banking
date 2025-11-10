import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getUser } from "../services/userService";

export const Route = createFileRoute("/users_/$userId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { userId } = Route.useParams();

  const { data, isPending, error } = useQuery({
    queryKey: [userId, "users"],
    queryFn: (req) => getUser({ userId: req.queryKey[0] }),
    retry: (failureCount, error) => {
      if (error instanceof Error && "status" in error && error.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });

  if (isPending) {
    return <div>loading...</div>;
  }
  if (error) {
    if (error instanceof Error && "status" in error && error.status === 404) {
      return <div>User not found.</div>;
    }
    console.error(error);
    return <div>Failed to load.</div>;
  }
  return (
    <div>
      <ul>
        <li>First name: {data.firstName}</li>
        <li>Last name: {data.lastName}</li>
        <li>Address: {data.address}</li>
        <li>Phone number: {data.phoneNumber}</li>
        <li>Created at: {data.createdAt}</li>
        <li>User ID: {data.userId}</li>
      </ul>
    </div>
  );
}
