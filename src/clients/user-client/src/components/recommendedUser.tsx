import { Avatar, AvatarFallback, AvatarImage } from "@repo/web-ui/avatar";
import {
  Item,
  ItemContent,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@repo/web-ui/item";

export function RecommendedUserCard() {
  return (
    <Item className="justify flex gap-1.5 p-0">
      <ItemHeader className="flex justify-center">
        <ItemMedia>
          <Avatar className="size-12">
            <AvatarImage src="TODO" />
            <AvatarFallback>AK</AvatarFallback>
          </Avatar>
        </ItemMedia>
      </ItemHeader>
      <ItemContent>
        <ItemTitle className="justify-center w-full">Example User</ItemTitle>
      </ItemContent>
    </Item>
  );
}
