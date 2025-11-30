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

export function TransactionCard() {
  return (
    <Item className="not-last:border-b-border rounded-none">
      <ItemMedia>
        <Avatar className="size-12">
          <AvatarImage src="TODO" />
          <AvatarFallback>AK</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Item Payment</ItemTitle>
        <ItemDescription>You sent | 19.12 | 28.11.2025</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Badge variant="secondary">123.45€</Badge>
      </ItemActions>
    </Item>
    // <Card>
    //   <CardContent className="flex items-center justify-between">
    //     <div className="flex items-center gap-2">

    //       <div>
    //         <p>Example Payment</p>
    //         <p className="text-muted-foreground -mt-1 text-sm">
    //
    //         </p>
    //       </div>
    //     </div>

    //   </CardContent>
    // </Card>
  );
}
