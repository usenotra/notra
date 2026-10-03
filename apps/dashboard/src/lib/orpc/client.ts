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

function isUnbatchedProcedure(path: readonly string[]) {
  if (NON_BATCHABLE_ROOT_PATHS.has(path[0] ?? "")) {
    return true;
  }
  // The GitHub catalog talks to GitHub. Keeping it out of the page batch
  // means a slow GitHub response cannot hold back the saved repositories.
  return path[0] === "github" && path[1] === "app" && path[2] === "catalog";
}

const link = new RPCLink({
  plugins: [
    new BatchLinkPlugin({
      exclude: ({ path }) => isUnbatchedProcedure(path),
      groups: [{ condition: () => true, context: {} }],
    }),
  ],
  url: `${getBaseUrl()}/rpc`,
});

export const dashboardOrpcClient: RouterClient<DashboardRouter> =
  createORPCClient(link);

export type DashboardORPCClient = RouterClient<DashboardRouter>;
