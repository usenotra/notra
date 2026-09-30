"use client";

import { Badge } from "@notra/ui/components/ui/badge";
import { DEFAULT_GEO_PRESENCE_BADGE_LABELS } from "@notra/ui/constants/geo";
import type { PresenceBadgeProps } from "@notra/ui/types/geo";

export function PresenceBadge({ status, labels }: PresenceBadgeProps) {
  if (!status || status === "training-data") {
    return null;
  }
  const resolvedLabels = { ...DEFAULT_GEO_PRESENCE_BADGE_LABELS, ...labels };
  const label =
    status === "retrieval-only"
      ? resolvedLabels.retrievalOnly
      : resolvedLabels.invisible;
  const title =
    status === "retrieval-only"
      ? resolvedLabels.retrievalOnlyTitle
      : resolvedLabels.invisibleTitle;
  return (
    <Badge
      className="whitespace-nowrap rounded-sm text-[0.6875rem]"
      title={title}
      variant="outline"
    >
      {label}
    </Badge>
  );
}
