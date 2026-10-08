import { useEffect, useState } from "react";

import { GEO_LOG_ARRIVE_ANIMATION_MS } from "@/constants/geo-citations";
import type {
  ArrivedRowIdsInput,
  ArrivedRowIdsState,
} from "@/types/arrived-row-ids";

const NO_ARRIVALS: ReadonlyMap<string, number> = new Map();

/**
 * Marks rows that appear in `ids` after the first load of one view, in table
 * order, so a live table can open them one by one. `viewKey` names the view
 * (page, filter, scan): changing it rebases silently instead of animating
 * rows that were merely out of sight.
 */
export function useArrivedRowIds({
  ids,
  viewKey,
  ready,
  enabled,
}: ArrivedRowIdsInput): ReadonlyMap<string, number> {
  // Adjusted during render ("state from previous props") so the render that
  // shows a new row already marks it.
  const [state, setState] = useState<ArrivedRowIdsState>(() => ({
    viewKey,
    known: new Set(ids),
    arrived: new Map(),
  }));
  const isNewView = state.viewKey !== viewKey;
  const fresh = ids.filter((id) => !state.known.has(id));
  if (ready && (isNewView || fresh.length > 0)) {
    // The stagger slot is fixed when a row arrives, so a later batch neither
    // cuts off nor re-times the animations still running.
    setState({
      viewKey,
      known: new Set([...(isNewView ? [] : state.known), ...ids]),
      arrived:
        isNewView || !enabled
          ? new Map()
          : new Map([
              ...state.arrived,
              ...fresh.map((id, slot): [string, number] => [id, slot]),
            ]),
    });
  }
  const { arrived } = state;
  // A row scrolled out and back would replay its arrival, so the marks come
  // off once the newest animation is over.
  useEffect(() => {
    if (arrived.size === 0) {
      return;
    }
    const clear = setTimeout(
      () => setState((prev) => ({ ...prev, arrived: new Map() })),
      GEO_LOG_ARRIVE_ANIMATION_MS
    );
    return () => clearTimeout(clear);
  }, [arrived]);

  return ready ? arrived : NO_ARRIVALS;
}
