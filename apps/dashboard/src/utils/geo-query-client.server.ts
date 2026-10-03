import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import { getRequest } from "@tanstack/react-start/server";

const requestQueryClients = new WeakMap<Request, QueryClient>();

export function getGeoServerQueryClient() {
  const request = getRequest();
  let queryClient = requestQueryClients.get(request);
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: 60_000, retry: false },
        dehydrate: {
          shouldDehydrateQuery: (query) =>
            defaultShouldDehydrateQuery(query) ||
            query.state.status === "pending",
        },
      },
    });
    requestQueryClients.set(request, queryClient);
  }
  return queryClient;
}
