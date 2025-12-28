import { UserRoundCogIcon } from "lucide-react";

import type { Transfer, User } from "@repo/validators/user";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/web-ui/avatar";
import { Badge } from "@repo/web-ui/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@repo/web-ui/item";

import { formatBalance, formatDateTime } from "../util/formatters";

interface TransferCardProps {
  transfer: Transfer;
  user: User;
}

export function TransferCard({ transfer, user }: TransferCardProps) {
  const isCreditTransfer = transfer.creditAccountId == user.userId;
  const isSystemTransfer =
    transfer.creditAccountId == "1" || transfer.debitAccountId == "1";

  return (
    <Item className="not-last:border-b-border rounded-none">
      <ItemMedia>
        <Avatar className="size-12">
          <AvatarImage src="TODO" />
          <AvatarFallback>
            {isSystemTransfer ? <UserRoundCogIcon /> : "AK"}
          </AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {isCreditTransfer
            ? transfer.debitUserFullName
            : transfer.creditUserFullName}
          {isSystemTransfer ? transfer.transferId : ""}
        </ItemTitle>
        <ItemDescription>
          {isCreditTransfer ? "You sent" : "Sent you"} •{" "}
          {formatDateTime(transfer.timestamp)}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Badge variant="secondary">
          {isCreditTransfer ? "-" : "+"}
          {formatBalance(transfer.amount)}
        </Badge>
      </ItemActions>
    </Item>
  );
}
