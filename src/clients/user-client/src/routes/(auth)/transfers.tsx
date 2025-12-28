import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import InfiniteScroll from "react-infinite-scroll-component";

import type { GetUserTransfersResponse } from "@repo/validators/user";
import { Spinner } from "@repo/web-ui/spinner";

import { TransferGroup } from "../../components/transferGroup";
import { getUserTransfers } from "../../services/userService";
import { processTransfers } from "../../util/transfers";
import { toast } from "sonner";

export const Route = createFileRoute("/(auth)/transfers")({
  component: RouteComponent,
  loader: async () => ({
    initialTransfers: (await getUserTransfers({ limit: 100 })).transfers,
  }),
  onError: (err) => {
    console.error(err);
    toast.error("Failed to load page :(");
  },
  errorComponent: () => <p>Something has went terribly wrong :(</p>,
});

function InfiniteTransferList() {
  const { initialTransfers } = useLoaderData({ from: Route.id });
  const transferQuery = useInfiniteQuery({
    queryKey: ["infinite-transfers"],
    initialData: {
      pages: [{ transfers: initialTransfers }],
      pageParams: [""],
    },
    refetchOnWindowFocus: false,
    queryFn: ({ pageParam }) =>
      getUserTransfers({
        limit: 100,
        maxTimestamp: pageParam === "" ? undefined : pageParam,
      }),
    initialPageParam: "",
    getNextPageParam: (lastPage: GetUserTransfersResponse) => {
      if (lastPage.transfers.length < 100) return undefined;

      const lastTransfer = lastPage.transfers[lastPage.transfers.length - 1];
      return lastTransfer.timestamp;
    },
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      items: processTransfers(data.pages),
    }),
  });

  if (transferQuery.isError)
    return <p>Failed: {transferQuery.error.message}</p>;

  return (
    <InfiniteScroll
      dataLength={transferQuery.data.items.flatMap((item) => item.items).length}
      next={transferQuery.fetchNextPage}
      hasMore={transferQuery.hasNextPage}
      loader={
        <div className="flex items-center justify-center space-x-2 py-1">
          <Spinner className="text-muted-foreground flex items-center justify-center" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
      scrollableTarget="main"
    >
      {transferQuery.data.items.map((group) => (
        <TransferGroup
          key={group.label}
          label={group.label}
          transfers={group.items}
        />
      ))}
    </InfiniteScroll>
  );
}

function RouteComponent() {
  return (
    <section className="space-y-1.5">
      <InfiniteTransferList />
    </section>
  );
}
