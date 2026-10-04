import type { ClientContext } from "@orpc/client";
import {
  BatchLinkPlugin,
  SimpleCsrfProtectionLinkPlugin,
} from "@orpc/client/plugins";

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

export function createDashboardLinkPlugins<T extends ClientContext>() {
  return [
    new BatchLinkPlugin<T>({
      exclude: ({ path }) => isUnbatchedProcedure(path),
      groups: [{ condition: () => true, context: {} as T }],
    }),
    new SimpleCsrfProtectionLinkPlugin<T>(),
  ];
}
