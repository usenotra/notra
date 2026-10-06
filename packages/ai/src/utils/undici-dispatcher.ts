import { AsyncLocalStorage } from "node:async_hooks";

import { LONG_FETCH_TIMEOUT_MS } from "@notra/ai/constants/repo-image";
import { logWarn } from "@notra/ai/utils/server-log";
import {
  Agent,
  Dispatcher,
  getGlobalDispatcher,
  setGlobalDispatcher,
} from "undici";

const dispatcherStorage = new AsyncLocalStorage<Dispatcher>();
const fallbackDispatcher = getGlobalDispatcher();

class ContextDispatcher extends Dispatcher {
  dispatch(
    options: Dispatcher.DispatchOptions,
    handler: Dispatcher.DispatchHandler
  ) {
    return (dispatcherStorage.getStore() ?? fallbackDispatcher).dispatch(
      options,
      handler
    );
  }
}

setGlobalDispatcher(new ContextDispatcher());

export async function withLongFetchTimeouts<T>(callback: () => Promise<T>) {
  const dispatcher = new Agent({
    headersTimeout: LONG_FETCH_TIMEOUT_MS,
    bodyTimeout: LONG_FETCH_TIMEOUT_MS,
    keepAliveTimeout: 60_000,
  });

  try {
    return await dispatcherStorage.run(dispatcher, callback);
  } finally {
    if (typeof dispatcher.close === "function") {
      await dispatcher.close().catch((error: unknown) => {
        logWarn("Failed to close long-timeout fetch dispatcher", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }
  }
}
