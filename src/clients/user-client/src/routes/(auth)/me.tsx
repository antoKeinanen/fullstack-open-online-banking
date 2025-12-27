import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";

import type { GetActiveSessionsResponse } from "@repo/validators/user";
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
} from "../../services/authService";
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

  return (
    <div>
      <ItemGroup>
        <p className="text-foreground py-2 first:pt-0">Sessions</p>
        {sessions.map((session) => (
          <SessionCard key={session.sessionId} {...session} />
        ))}
      </ItemGroup>
    </div>
  );
}
