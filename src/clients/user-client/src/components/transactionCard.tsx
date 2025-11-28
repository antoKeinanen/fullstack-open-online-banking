import { Avatar, AvatarFallback, AvatarImage } from "@repo/web-ui/avatar";
import { Badge } from "@repo/web-ui/badge";
import { Card, CardContent } from "@repo/web-ui/card";

export function TransactionCard() {
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src="TODO" />
            <AvatarFallback>AK</AvatarFallback>
          </Avatar>
          <div>
            <p>Example Payment</p>
            <p className="text-muted-foreground -mt-1 text-sm">
              You sent | 19.12 | 28.11.2025
            </p>
          </div>
        </div>
        <Badge className="text-lg" variant="secondary">
          123.45€
        </Badge>
      </CardContent>
    </Card>
  );
}
