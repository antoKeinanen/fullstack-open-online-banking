import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { ChevronDownIcon, LogOutIcon } from "lucide-react";
import { toast } from "sonner";

import type { GetActiveSessionsResponse } from "@repo/validators/user";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/web-ui/accordion";
import { Button } from "@repo/web-ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@repo/web-ui/item";

import {
  getActiveSessions,
  invalidateSession,
  logOut,
} from "../../services/authService";
import { useAuthStore } from "../../stores/authStore";
import { toastErrors } from "../../util/errorToaster";
import { formatDateTime } from "../../util/formatters";

export const Route = createFileRoute("/(auth)/me")({
  component: RouteComponent,
  loader: async () => ({
    sessions: (await getActiveSessions()).sessions,
  }),
  errorComponent: () => <p>Failed to load page data</p>,
});

export function SessionCard({
  sessionId,
  application,
  device,
  ipAddress,
  createdAt,
}: GetActiveSessionsResponse["sessions"][number]) {
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async () => {
      await invalidateSession({ sessionId });
    },
    onSuccess: async () => {
      toast.success("Successfully logged out");
      await navigate({ reloadDocument: true });
    },
    onError: toastErrors,
  });

  return (
    <Item className="not-last:border-b-border rounded-none">
      <ItemContent>
        <ItemTitle>
          {application}, {device}
        </ItemTitle>
        <ItemDescription>
          From: {ipAddress} <br />
          Created: {formatDateTime(createdAt)}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          variant="ghost"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          <LogOutIcon /> Logout
        </Button>
      </ItemActions>
    </Item>
  );
}

function RouteComponent() {
  const { sessions } = Route.useLoaderData();

  const { clearSession } = useAuthStore();
  const { navigate } = useRouter();

  const logOutMutation = useMutation({
    mutationKey: ["logout"],
    mutationFn: logOut,
    onSuccess: async () => {
      clearSession();
      await navigate({ to: "/login", replace: true });
    },
    onError: () => {
      toast.error("Failed to log out. Try again later");
    },
  });

  return (
    <div className="mx-auto h-full w-full max-w-3xl">
      <Accordion type="multiple">
        <AccordionItem value="sessions">
          <AccordionTrigger className="p-0">
            <Item className="w-full items-stretch">
              <ItemContent>
                <ItemTitle>Sessions</ItemTitle>
                <ItemDescription>
                  Manage your active sessions across devices
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <ChevronDownIcon
                  data-chevron
                  className="text-muted-foreground transition-transform duration-200"
                />
              </ItemActions>
            </Item>
          </AccordionTrigger>
          <AccordionContent>
            <ItemGroup className="px-4">
              {sessions.map((session) => (
                <SessionCard key={session.sessionId} {...session} />
              ))}
            </ItemGroup>
          </AccordionContent>
        </AccordionItem>

        <Link to="/stripe/refresh-onboard">
          <Item className="border-border w-full items-stretch rounded-none border-0 border-b">
            <ItemContent>
              <ItemTitle>Stripe Onboarding</ItemTitle>
              <ItemDescription>
                Complete your Stripe onboarding to withdraw funds
              </ItemDescription>
            </ItemContent>
          </Item>
        </Link>

        <Item
          className="w-full items-stretch rounded-none"
          onClick={() => logOutMutation.mutate()}
          role="button"
          tabIndex={0}
        >
          <ItemContent>
            <ItemTitle>Log Out</ItemTitle>
            <ItemDescription>
              Log out from your account on this device
            </ItemDescription>
          </ItemContent>
        </Item>
      </Accordion>
    </div>
  );
}
