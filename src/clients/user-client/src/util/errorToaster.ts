import { toast } from "sonner";

import type { ApiError } from "./api";

export function toastErrors(error: ApiError) {
  error.errors.filter((e) => e.showUser).map((e) => toast.error(e.message));
}
