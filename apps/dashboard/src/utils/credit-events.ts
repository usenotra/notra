import type { ListEventsRow } from "@/types/billing/credits";
import { formatSnakeCaseLabel } from "@/utils/format";

export function getCreditEventLabel(
  event: ListEventsRow,
  aiChatLabel: string,
  outputTypeLabel: (outputType: string) => string
) {
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
    return outputTypeLabel(outputType);
  }
  const source =
    properties &&
    "source" in properties &&
    typeof properties.source === "string"
      ? properties.source
      : undefined;
  if (source === "standalone_chat" || source === "chat") {
    return aiChatLabel;
  }
  return source ? formatSnakeCaseLabel(source) : "—";
}
