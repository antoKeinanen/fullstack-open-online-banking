import { Avatar, AvatarImage, AvatarFallback } from "@repo/web-ui/avatar";

export function RecommendedUserCard() {
  return (
    <div className="flex w-min flex-col items-center justify-center text-center">
      <Avatar className="h-12 w-12">
        <AvatarImage src="TODO" />
        <AvatarFallback>AK</AvatarFallback>
      </Avatar>
      <p className="leading-5">Example User</p>
    </div>
  );
}
