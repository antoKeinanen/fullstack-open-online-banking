import { createFileRoute, Outlet } from "@tanstack/react-router";

import { MobileNavigation } from "../../components/mobileNavigation";
import { canAccessPage } from "../../util/auth";

export const Route = createFileRoute("/(auth)")({
  component: () => (
    <div className="bg-muted flex h-dvh w-full flex-col overflow-clip">
      <main
        className="flex w-full flex-1 flex-col overflow-auto px-4 py-8"
        id="main"
      >
        <Outlet />
      </main>
      <MobileNavigation />
    </div>
  ),
  beforeLoad: canAccessPage,
});
