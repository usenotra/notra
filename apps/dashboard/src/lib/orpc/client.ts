import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";

import { createDashboardLinkPlugins } from "./link-plugins";
import type { DashboardRouter } from "./router";

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.APP_URL ??
    "http://localhost:3000"
  );
}

const link = new RPCLink({
  // Looked up per call rather than captured once, so a page that swaps
  // `fetch` (the break-ui preview's write guard) also covers this client.
  fetch: (request, init) => globalThis.fetch(request, init),
  plugins: createDashboardLinkPlugins(),
  url: `${getBaseUrl()}/rpc`,
});

export const dashboardOrpcClient: RouterClient<DashboardRouter> =
  createORPCClient(link);

export type DashboardORPCClient = RouterClient<DashboardRouter>;
