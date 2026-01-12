import type { SuggestedUser } from "@repo/validators/user";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/web-ui/avatar";
import {
  Item,
  ItemContent,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@repo/web-ui/item";

interface RecommendedUserCardProps {
  user: SuggestedUser;
}

export function RecommendedUserCard({ user }: RecommendedUserCardProps) {
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <Item className="justify flex gap-1.5 p-0">
      <ItemHeader className="flex justify-center">
        <ItemMedia>
          <Avatar className="size-12">
            <AvatarImage src={undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </ItemMedia>
      </ItemHeader>
      <ItemContent>
        <ItemTitle className="w-full justify-center text-center">
          {fullName}
        </ItemTitle>
      </ItemContent>
    </Item>
  );
}
