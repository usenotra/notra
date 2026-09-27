import type {
  GeoChangeCheckState,
  GeoChangeEvent,
} from "@notra/geo-core/types/geo";
import {
  engineFamilyLabel,
  engineFamilyOf,
} from "@notra/geo-core/utils/geo-engine-family";

import type { GeoChangeDetail, GeoChangeStateLabel } from "@/types/geo";

export function geoChangeEngineLabel(engine: string): string {
  return engineFamilyLabel(engineFamilyOf(engine));
}

export function describeGeoChangeState(
  state: GeoChangeCheckState | null
): GeoChangeStateLabel {
  if (!state) {
    return { key: "new" };
  }
  if (!state.mentioned) {
    return { key: "notMentioned" };
  }
  if (state.position === null) {
    return { key: "mentioned" };
  }
  return { key: "position", position: state.position };
}

export function isSameGeoChangeState(
  left: GeoChangeStateLabel,
  right: GeoChangeStateLabel
): boolean {
  if (left.key === "position" && right.key === "position") {
    return left.position === right.position;
  }
  return left.key === right.key;
}

// Citation rows track whether your pages were cited, not where the brand
// ranks, so they describe the cited state instead of the mention state.
export function describeGeoChangeDetail(
  event: GeoChangeEvent
): GeoChangeDetail {
  if (event.kind === "citation_added") {
    return { before: { key: "notCited" }, after: { key: "cited" } };
  }
  if (event.kind === "citation_removed") {
    return { before: { key: "cited" }, after: { key: "notCited" } };
  }
  return {
    before: describeGeoChangeState(event.previous),
    after: describeGeoChangeState(event.current),
  };
}

export function geoChangePositionSortValue(event: GeoChangeEvent): number {
  return event.current.position ?? Number.MAX_SAFE_INTEGER;
}
