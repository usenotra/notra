import { AsyncLocalStorage } from "node:async_hooks";

import type { OperationalContext } from "@notra/ai/types/operational-log";

const storage = new AsyncLocalStorage<OperationalContext>();

export function getOperationalContext(): OperationalContext | undefined {
  return storage.getStore();
}

export function runWithOperationalContext<T>(
  context: OperationalContext,
  operation: () => T
): T {
  return storage.run(context, operation);
}
