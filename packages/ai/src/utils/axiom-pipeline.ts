import {
  AXIOM_PERMANENT_ERROR_PATTERN,
  LOG_PIPELINE_OPTIONS,
  LOG_TRANSPORT_TIMEOUT_MS,
} from "@notra/ai/constants/evlog";
import { createShippingPipeline } from "@notra/ai/utils/shipping-pipeline";
import type { DrainContext } from "evlog";
import { type AxiomConfig, sendBatchToAxiom } from "evlog/axiom";
import type { DrainPipelineOptions } from "evlog/pipeline";

export function createAxiomPipeline(
  config: AxiomConfig,
  options: DrainPipelineOptions<DrainContext> = LOG_PIPELINE_OPTIONS
) {
  return createShippingPipeline(
    (batch) =>
      sendBatchToAxiom(
        batch.map(({ event }) => event),
        {
          ...config,
          timeout: config.timeout ?? LOG_TRANSPORT_TIMEOUT_MS,
          retries: 0,
        }
      ),
    {
      label: `evlog/${config.dataset}`,
      permanentErrorPattern: AXIOM_PERMANENT_ERROR_PATTERN,
      disabledMessage: `[evlog/${config.dataset}] Axiom rejected the request, log shipping is off until the next deploy`,
    },
    options
  );
}
