import {
  ArrowLeftRightIcon,
  ClockIcon,
  UserRoundCogIcon,
  XCircleIcon,
} from "lucide-react";

import type { Transfer } from "@repo/validators/user";
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
}

function formatTransfer({
  voided,
  pending,
  isSystemTransfer,
  isIncreasingTransfer,
  creditUserFirstName,
  creditUserLastName,
  debitUserFirstName,
  debitUserLastName,
}: Transfer) {
  const otherUserFirstName = isIncreasingTransfer
    ? creditUserFirstName
    : debitUserFirstName;
  const otherUserLastName = isIncreasingTransfer
    ? creditUserLastName
    : debitUserLastName;
  const otherUserFullName = `${otherUserFirstName} ${otherUserLastName}`.trim();
  const otherUserInitials =
    `${otherUserFirstName[0]}${otherUserLastName[0]}`.toUpperCase();

  const conditions = [
    {
      check: () => voided && isSystemTransfer,
      label: "Failed",
      avatar: <XCircleIcon />,
      symbol: isIncreasingTransfer ? "+" : "-",
      recipient: "System Float Account",
      initials: null,
    },
    {
      check: () => voided,
      label: "Failed",
      avatar: <XCircleIcon />,
      symbol: isIncreasingTransfer ? "+" : "-",
      recipient: otherUserFullName,
      initials: otherUserInitials,
    },
    {
      check: () => pending && isSystemTransfer,
      label: "Pending",
      avatar: <ClockIcon />,
      symbol: isIncreasingTransfer ? "+" : "-",
      recipient: "System Float Account",
      initials: null,
    },
    {
      check: () => pending,
      label: "Pending",
      avatar: <ClockIcon />,
      symbol: isIncreasingTransfer ? "+" : "-",
      recipient: otherUserFullName,
      initials: otherUserInitials,
    },
    {
      check: () => isSystemTransfer,
      label: isIncreasingTransfer ? "Deposited" : "Withdrew",
      avatar: <UserRoundCogIcon />,
      symbol: isIncreasingTransfer ? "+" : "-",
      recipient: "System Float Account",
      initials: null,
    },
    {
      check: () => !isSystemTransfer,
      label: isIncreasingTransfer ? "Sent You" : "You Sent",
      avatar: null,
      symbol: isIncreasingTransfer ? "+" : "-",
      recipient: otherUserFullName,
      initials: otherUserInitials,
    },
  ];

  return (
    conditions.find((c) => c.check()) ?? {
      avatar: <ArrowLeftRightIcon />,
      label: "Transfer",
      symbol: "",
      recipient: "Unexpected",
      initials: null,
    }
  );
}

export function TransferCard({ transfer }: TransferCardProps) {
  const format = formatTransfer(transfer);
  return (
    <Item className="not-last:border-b-border rounded-none">
      <ItemMedia>
        <Avatar className="size-12">
          <AvatarImage src={undefined} />
          <AvatarFallback>{format.initials ?? format.avatar}</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{format.recipient}</ItemTitle>
        <ItemDescription>
          {format.label} • {formatDateTime(transfer.timestamp)}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Badge variant="secondary">
          {format.symbol} {formatBalance(transfer.amount)}
        </Badge>
      </ItemActions>
    </Item>
  );
}
