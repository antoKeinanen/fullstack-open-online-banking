import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BanknoteArrowDownIcon,
  BanknoteArrowUpIcon,
  LockIcon,
  WalletIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/web-ui/avatar";
import { Button } from "@repo/web-ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/web-ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@repo/web-ui/item";

import type { TransactionDialogState } from "../components/dialog/transactionDialog";
import { TransactionDialog } from "../components/dialog/transactionDialog";
import { RecommendedUserCard } from "../components/recommendedUser";
import { TransactionCard } from "../components/transactionCard";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [transactionState, setTransactionState] =
    useState<TransactionDialogState>("deposit");

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
          <ItemTitle>Anto Keinänen</ItemTitle>
        </ItemContent>
        <ItemActions>
          <Button variant="outline">
            <LockIcon /> Log out
          </Button>
        </ItemActions>
      </Item>

      <Card className="w-full gap-2">
        <CardHeader>
          <CardTitle className="text-xl">12 345.67€</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 grid-rows-2 gap-2">
            <Button
              className="col-span-2"
              onClick={() => setTransactionDialogOpen(true)}
            >
              <WalletIcon />
              Deposit
            </Button>
            <Button variant="secondary">
              <BanknoteArrowUpIcon /> Send
            </Button>
            <Button variant="secondary">
              <BanknoteArrowDownIcon /> Request
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-1.5">
        <div className="text-foreground flex items-center justify-between">
          <p>Recent transactions</p>
          <Link to="/transactions">
            <Button variant="link">View all</Button>
          </Link>
        </div>

        <ItemGroup>
          {[0, 1, 2].map((_, i) => (
            <TransactionCard key={`transaction-card-${i}`} />
          ))}
        </ItemGroup>
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
