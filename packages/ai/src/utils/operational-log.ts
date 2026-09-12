import { log } from "@notra/ai/evlog";
import type { OperationalLogEvent } from "@notra/ai/types/operational-log";

import { getOperationalContext } from "./operational-context";

export function logOperationalEvent(event: OperationalLogEvent): void {
  try {
    const fields = { ...getOperationalContext(), ...event };
    if (event.errorKind === "client_error") {
      log.warn(fields);
    } else if (event.outcome === "error") {
      log.error(fields);
    } else {
      log.info(fields);
    }
  } catch (error) {
    console.error("[evlog] operational event capture failed", error);
  }
}
