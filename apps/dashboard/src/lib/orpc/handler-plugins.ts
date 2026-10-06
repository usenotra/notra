import type { Context } from "@orpc/server";
import {
  BatchHandlerPlugin,
  SimpleCsrfProtectionHandlerPlugin,
} from "@orpc/server/plugins";

/**
 * Only our client sends the CSRF header (see `createDashboardLinkPlugins`), so
 * a cross-site form post can never reach a procedure, cookies or not. Batched
 * calls are unpacked first and each still needs the header.
 */
export function createDashboardHandlerPlugins<T extends Context>() {
  return [
    new BatchHandlerPlugin<T>(),
    new SimpleCsrfProtectionHandlerPlugin<T>(),
  ];
}
