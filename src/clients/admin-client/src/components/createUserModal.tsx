import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";

import { createUserRequestSchema } from "@repo/validators/user";

import { createUser } from "../services/userService";

export function CreateUserModal() {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const { mutate: createUserMutation } = useMutation({
    mutationFn: createUser,
    onSuccess: console.log,
    onError: console.error,
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const userData = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      phoneNumber: formData.get("phoneNumber"),
      address: formData.get("address"),
    };

    const parsedFormData = createUserRequestSchema.safeParse(userData);
    if (!parsedFormData.success) {
      console.error(
        "Failed to parse form data:",
        userData,
        parsedFormData.error,
      );
      return;
    }

    createUserMutation(parsedFormData.data);
    dialogRef.current?.close();
  };

  return (
    <>
      <button onClick={() => dialogRef.current?.showModal()}>
        Create user
      </button>
      <dialog
        ref={dialogRef}
        className="absolute top-1/2 left-1/2 -translate-1/2 p-4"
      >
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-x-2.5">
            <label htmlFor="firstName">First name</label>
            <input
              className="rounded-md border"
              type="text"
              name="firstName"
              id="firstName"
            />
          </div>
          <div className="space-x-2.5">
            <label htmlFor="lastName">Last name</label>
            <input
              className="rounded-md border"
              type="text"
              name="lastName"
              id="lastName"
            />
          </div>
          <div className="space-x-2.5">
            <label htmlFor="phoneNumber">Phone number</label>
            <input
              className="rounded-md border"
              type="text"
              name="phoneNumber"
              id="phoneNumber"
            />
          </div>
          <div className="space-x-2.5">
            <label htmlFor="address">Address</label>
            <input
              className="rounded-md border"
              type="text"
              name="address"
              id="address"
            />
          </div>

          <input type="submit" value="submit" />
        </form>
      </dialog>
    </>
  );
}
