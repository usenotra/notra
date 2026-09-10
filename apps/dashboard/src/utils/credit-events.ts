import type { ListEventsRow } from "@/types/billing/credits";
import { formatSnakeCaseLabel } from "@/utils/format";
import { getOutputTypeLabel } from "@/utils/output-types";

export function getCreditEventLabel(event: ListEventsRow) {
  const properties =
    typeof event.properties === "object" && event.properties !== null
      ? event.properties
      : null;
  const outputType =
    properties &&
    "output_type" in properties &&
    typeof properties.output_type === "string"
      ? properties.output_type
      : undefined;
  if (outputType) {
    return getOutputTypeLabel(outputType);
  }
  const source =
    properties &&
    "source" in properties &&
    typeof properties.source === "string"
      ? properties.source
      : undefined;
  if (source === "standalone_chat" || source === "chat") {
    return "AI Chat";
  }
  return source ? formatSnakeCaseLabel(source) : "—";
}
