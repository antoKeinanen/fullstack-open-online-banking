import { createFileRoute } from "@tanstack/react-router";

import { canAccessPage } from "../../util/auth";

export const Route = createFileRoute("/(auth)")({
  beforeLoad: canAccessPage,
});
