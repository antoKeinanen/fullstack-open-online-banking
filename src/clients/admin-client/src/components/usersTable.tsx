import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { getAllUsersPaginated } from "../services/userService";

export function UserTable() {
  const { data, isPending, error } = useQuery({
    queryKey: ["users"],
    queryFn: getAllUsersPaginated,
  });

  if (isPending) {
    return <div>loading...</div>;
  }
  if (error) {
    console.error(error);
    return <div>Failed to load.</div>;
  }

  console.log(data);
  return (
    <div>
      <table className="w-full">
        <thead>
          <tr>
            <td>User ID</td>
            <td>Phone number</td>
            <td>First name</td>
            <td>Last name</td>
            <td>Address</td>
            <td>Created at</td>
          </tr>
        </thead>
        <tbody>
          {data.users.map((user) => (
            <tr id={user.userId}>
              <td>
                <Link
                  className="text-blue-500 underline"
                  to="/users/$userId"
                  params={{ userId: user.userId }}
                >
                  {user.userId}
                </Link>
              </td>
              <td>{user.phoneNumber}</td>
              <td>{user.firstName}</td>
              <td>{user.lastName}</td>
              <td>{user.address}</td>
              <td>{user.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
