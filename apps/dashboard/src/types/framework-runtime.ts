import type { AsyncLocalStorage } from "node:async_hooks";

import type { H3Event } from "nitro/h3";

export type DashboardRuntimeHost = typeof globalThis & {
  __notraDashboardRequests?: AsyncLocalStorage<H3Event>;
};
