import { AsyncLocalStorage } from "node:async_hooks";

import { type H3Event, onDispose } from "nitro/h3";

import type { DashboardRuntimeHost } from "../../types/framework-runtime";

const host = globalThis as DashboardRuntimeHost;
host.__notraDashboardRequests ??= new AsyncLocalStorage<H3Event>();
export const dashboardRequestContext = host.__notraDashboardRequests;

export function afterResponse(task: Promise<unknown> | (() => unknown)): void {
  const event = dashboardRequestContext.getStore();
  if (!event) {
    throw new Error("No dashboard request lifetime available");
  }
  onDispose(event, typeof task === "function" ? task : () => task);
}
