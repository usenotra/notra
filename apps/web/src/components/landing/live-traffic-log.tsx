"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { CitationRows } from "@/components/landing/citation-rows";
import {
  HERO_COLLAGE_CITATION_HEADERS,
  HERO_COLLAGE_CITATION_ROWS,
} from "@/constants/landing/hero-collage";
import { LIVE_TRAFFIC_MAX_ROWS } from "@/constants/landing/live-traffic";
import { randomLiveRow, seedLiveRows } from "@/lib/landing/live-traffic";
import { pageClockElapsedMs, usePageClockBase } from "@/lib/landing/page-clock";
import type { HeroCollageProps } from "@/types/landing/hero";

export function LiveTrafficLog({ engine }: HeroCollageProps) {
  const reduceMotion = useReducedMotion();
  const base = usePageClockBase();
  const previousEngine = useRef(engine);
  const [rows, setRows] = useState(() =>
    seedLiveRows(HERO_COLLAGE_CITATION_ROWS)
  );
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const live = reduceMotion === false;

  useEffect(() => {
    if (!live || previousEngine.current === engine) {
      return;
    }
    previousEngine.current = engine;
    const row = randomLiveRow(pageClockElapsedMs(), engine);
    setEnteringId(row.id);
    setRows((previous) => [row, ...previous].slice(0, LIVE_TRAFFIC_MAX_ROWS));
  }, [engine, live]);

  return (
    <CitationRows
      animated={live}
      base={base}
      enteringId={enteringId}
      headers={HERO_COLLAGE_CITATION_HEADERS}
      rows={rows}
    />
  );
}
