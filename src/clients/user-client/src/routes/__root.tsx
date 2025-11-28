import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { MobileNavigation } from "../components/mobileNavigation";

const RootLayout = () => (
  <>
    <div className="bg-muted flex h-dvh w-full flex-col overflow-clip">
      <main className="h-full w-full overflow-auto px-4 py-8">
        <Outlet />
      </main>
      <MobileNavigation />
    </div>
    <TanStackRouterDevtools position="top-left" />
  </>
);

export const Route = createRootRoute({ component: RootLayout });
