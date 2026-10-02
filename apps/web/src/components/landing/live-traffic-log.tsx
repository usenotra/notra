import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { CitationRows } from "@/components/landing/citation-rows";
import {
  LIVE_TRAFFIC_HEADERS,
  LIVE_TRAFFIC_INTERVAL_MS,
  LIVE_TRAFFIC_MAX_ROWS,
  LIVE_TRAFFIC_SEED_ROWS,
} from "@/constants/landing/live-traffic";
import { randomLiveRow, seedLiveRows } from "@/lib/landing/live-traffic";
import { pageClockElapsedMs, usePageClockBase } from "@/lib/landing/page-clock";

export function LiveTrafficLog() {
  const reduceMotion = useReducedMotion();
  const base = usePageClockBase();
  const [rows, setRows] = useState(() => seedLiveRows(LIVE_TRAFFIC_SEED_ROWS));
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const live = reduceMotion === false;

  useEffect(() => {
    if (!live) {
      return;
    }
    const interval = window.setInterval(() => {
      const row = randomLiveRow(pageClockElapsedMs());
      setEnteringId(row.id);
      setRows((previous) => [row, ...previous].slice(0, LIVE_TRAFFIC_MAX_ROWS));
    }, LIVE_TRAFFIC_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [live]);

  return (
    <CitationRows
      animated={live}
      base={base}
      enteringId={enteringId}
      headers={LIVE_TRAFFIC_HEADERS}
      onEntered={(id) => {
        setEnteringId((current) => (current === id ? null : current));
      }}
      rows={rows}
    />
  );
}
