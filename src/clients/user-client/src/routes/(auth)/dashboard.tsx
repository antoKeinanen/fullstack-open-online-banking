import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  useLoaderData,
  useRouter,
} from "@tanstack/react-router";
import {
  BanknoteArrowDownIcon,
  BanknoteArrowUpIcon,
  BanknoteXIcon,
  LockIcon,
  WalletIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/web-ui/avatar";
import { Button } from "@repo/web-ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/web-ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/web-ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@repo/web-ui/item";

import type { TransactionDialogState } from "../../components/dialog/transactionDialog";
import { TransactionDialog } from "../../components/dialog/transactionDialog";
import { RecommendedUserCard } from "../../components/recommendedUser";
import { TransferCard } from "../../components/transferCard";
import { logOut } from "../../services/authService";
import { getUserDetails, getUserTransfers } from "../../services/userService";
import { useAuthStore } from "../../stores/authStore";
import { formatBalance } from "../../util/formatters";
import { useInvalidateRouteDataOnRefocus } from "../../util/useInvalidateRouteDataOnRefocus";

export const Route = createFileRoute("/(auth)/dashboard")({
  component: RouteComponent,
  loader: async () => {
    const [user, transfers] = await Promise.all([
      getUserDetails(),
      getUserTransfers({ limit: 3 }),
    ]);
    return {
      user: user,
      transfers: transfers.transfers,
    };
  },
  onError: (err) => {
    console.error(err);
    toast.error("Failed to load page :(");
  },
  errorComponent: () => <p>Something has went terribly wrong :(</p>,
});

function RouteComponent() {
  useInvalidateRouteDataOnRefocus();

  const { user, transfers } = useLoaderData({ from: Route.id });
  const { clearSession } = useAuthStore();
  const { navigate } = useRouter();
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [transactionState, setTransactionState] =
    useState<TransactionDialogState>("deposit");

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

  const openTransactionDialog = (state?: TransactionDialogState) => {
    setTransactionState(state ?? "deposit");
    setTransactionDialogOpen(true);
  };

  return (
    <main className="w-full space-y-4">
      <Item className="p-0">
        <ItemMedia>
          <Avatar className="size-10">
            <AvatarImage src="TODO" />
            <AvatarFallback>AK</AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemDescription className="-mb-1.5">Good evening</ItemDescription>
          <ItemTitle>
            {user.firstName} {user.lastName}
          </ItemTitle>
        </ItemContent>
        <ItemActions>
          <Button variant="outline" onClick={() => logOutMutation.mutate()}>
            <LockIcon /> Log out
          </Button>
        </ItemActions>
      </Item>

      <Card className="w-full gap-2">
        <CardHeader>
          <CardTitle className="text-xl">
            {formatBalance(user.balance)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 grid-rows-2 gap-2">
            <Button
              className="col-span-2"
              onClick={() => openTransactionDialog("deposit")}
            >
              <WalletIcon />
              Deposit
            </Button>
            <Button
              variant="secondary"
              onClick={() => openTransactionDialog("send")}
            >
              <BanknoteArrowUpIcon /> Send
            </Button>
            <Button
              variant="secondary"
              onClick={() => openTransactionDialog("request")}
            >
              <BanknoteArrowDownIcon /> Request
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-1.5">
        <div className="text-foreground flex items-center justify-between">
          <p>Recent transactions</p>
          <Link to="/transfers">
            <Button variant="link">View all</Button>
          </Link>
        </div>

        {transfers.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BanknoteXIcon />
              </EmptyMedia>
              <EmptyTitle>No recent transfers</EmptyTitle>
              <EmptyDescription>
                You don't have any recent transfers. Get started by depositing
                or requesting balance.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="flex flex-row justify-center space-x-2">
              <Button
                className="col-span-2"
                onClick={() => openTransactionDialog("deposit")}
              >
                <WalletIcon />
                Deposit
              </Button>

              <Button
                variant="secondary"
                onClick={() => openTransactionDialog("request")}
              >
                <BanknoteArrowDownIcon /> Request
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ItemGroup>
            {transfers.map((transfer) => (
              <TransferCard key={transfer.transferId} transfer={transfer} />
            ))}
          </ItemGroup>
        )}
      </section>

      <div className="text-foreground flex items-center justify-between">
        <p>Suggestions</p>
      </div>

      <Card>
        <CardContent className="grid grid-cols-4 grid-rows-2 items-center justify-items-center gap-3">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((_, i) => (
            <RecommendedUserCard key={`recommended-user-${i}`} />
          ))}
        </CardContent>
      </Card>
      <TransactionDialog
        open={transactionDialogOpen}
        setOpen={setTransactionDialogOpen}
        state={transactionState}
        setState={setTransactionState}
      />
    </main>
  );
}
