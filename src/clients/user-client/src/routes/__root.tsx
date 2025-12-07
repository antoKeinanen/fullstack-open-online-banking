import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { Toaster } from "@repo/web-ui/sonner";

import { MobileNavigation } from "../components/mobileNavigation";

const queryClient = new QueryClient();

const RootLayout = () => (
  <QueryClientProvider client={queryClient}>
    <div className="bg-muted flex h-dvh w-full flex-col overflow-clip">
      <main className="flex h-full w-full flex-col overflow-auto px-4 py-8">
        <Outlet />
      </main>
      <MobileNavigation />
    </div>
    <TanStackRouterDevtools position="top-left" />
    <Toaster richColors position="top-center" />
  </QueryClientProvider>
);

export const Route = createRootRoute({ component: RootLayout });
