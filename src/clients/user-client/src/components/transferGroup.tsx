import type { Transfer, User } from "@repo/validators/user";
import { ItemGroup } from "@repo/web-ui/item";

import { TransferCard } from "./transferCard";

export interface TransactionGroupProps {
  label: string;
  transfers: Transfer[];
  user: User;
}

export function TransferGroup({
  label,
  transfers,
  user,
}: TransactionGroupProps) {
  return (
    <ItemGroup>
      <p className="text-foreground py-2 first:pt-0">{label}</p>
      {transfers.map((transfer) => (
        <TransferCard
          transfer={transfer}
          user={user}
          key={transfer.transferId}
        />
      ))}
    </ItemGroup>
  );
}
