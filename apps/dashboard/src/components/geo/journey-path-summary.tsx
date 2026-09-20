import { JourneyPathPill } from "@/components/geo/journey-path-pill";
import type { JourneyPathSummaryProps } from "@/types/geo";
import {
  normalizeGeoJourneyPath,
  toGeoJourneyPathNode,
} from "@/utils/geo-journey";

/**
 * Entry page plus a count of the rest. A full trail cannot fit a table cell
 * without clipping mid-pill; the journey sheet shows the whole path.
 */
export function JourneyPathSummary({
  paths,
  distinctPaths,
}: JourneyPathSummaryProps) {
  const entry = paths[0];
  if (entry === undefined) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const sampled = new Set(paths.map(normalizeGeoJourneyPath)).size;
  const more = Math.max(distinctPaths, sampled) - 1;

  return (
    <span className="flex min-w-0 items-center gap-2" title={paths.join(" → ")}>
      <JourneyPathPill className="min-w-0" node={toGeoJourneyPathNode(entry)} />
      {more > 0 ? (
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          +{more.toLocaleString()} {more === 1 ? "page" : "pages"}
        </span>
      ) : null}
    </span>
  );
}
