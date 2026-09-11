import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import type { RouterClient } from "@orpc/server";

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

/**
 * Batch responses are buffered per item, so anything that streams or carries a
 * binary/FormData payload has to stay on its own request. The plugin already
 * skips `Blob`/`FormData`/async-iterator bodies; these namespaces are excluded
 * on top because they exist to move files around.
 */
const NON_BATCHABLE_ROOT_PATHS = new Set(["attachments", "upload"]);

const link = new RPCLink({
  plugins: [
    new BatchLinkPlugin({
      exclude: ({ path }) => NON_BATCHABLE_ROOT_PATHS.has(path[0] ?? ""),
      groups: [{ condition: () => true, context: {} }],
    }),
  ],
  url: `${getBaseUrl()}/rpc`,
});

export const dashboardOrpcClient: RouterClient<DashboardRouter> =
  createORPCClient(link);

export type DashboardORPCClient = RouterClient<DashboardRouter>;
