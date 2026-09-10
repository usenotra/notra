import { log } from "@notra/ai/evlog";
import { getOperationalContext } from "@notra/ai/utils/operational-context";

import type { WorkflowTelemetryEvent } from "@/types/workflow-monitoring";

export function logWorkflowTelemetry(event: WorkflowTelemetryEvent): void {
  try {
    const fields = {
      ...getOperationalContext(),
      ...event,
      surface: "workflow-monitoring",
    };
    if (event.outcome === "error") {
      log.error(fields);
    } else {
      log.info(fields);
    }
  } catch (error) {
    console.error("[telemetry] workflow event capture failed", error);
  }
}
