import { useEffect, useState } from "react";

import { GEO_LOG_ARRIVE_ANIMATION_MS } from "@/constants/geo-citations";
import type {
  ArrivedRowIdsInput,
  ArrivedRowIdsState,
} from "@/types/arrived-row-ids";

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
    arrived: new Set(),
  }));
  const isNewView = state.viewKey !== viewKey;
  const fresh = ids.filter((id) => !state.known.has(id));
  if (ready && (isNewView || fresh.length > 0)) {
    setState({
      viewKey,
      known: new Set([...(isNewView ? [] : state.known), ...ids]),
      arrived: isNewView || !enabled ? new Set() : new Set(fresh),
    });
  }
  const arrivedCount = state.arrived.size;
  // A row scrolled out and back would replay its arrival, so the mark comes
  // off once the animation is over.
  useEffect(() => {
    if (arrivedCount === 0) {
      return;
    }
    const clear = setTimeout(
      () => setState((prev) => ({ ...prev, arrived: new Set() })),
      GEO_LOG_ARRIVE_ANIMATION_MS
    );
    return () => clearTimeout(clear);
  }, [arrivedCount, state.known]);

  const order = new Map<string, number>();
  for (const id of ids) {
    if (ready && state.arrived.has(id)) {
      order.set(id, order.size);
    }
  }
  return order;
}
