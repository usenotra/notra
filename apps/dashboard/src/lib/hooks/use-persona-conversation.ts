"use client";

import type { GeoPersona } from "@notra/geo-core/types/geo-personas";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { GEO_PERSONA_EMPTY_TURNS } from "@/constants/geo-personas";
import { useAnswerReplay } from "@/lib/hooks/use-answer-replay";
import { useGeoStartScan, useIsGeoScanning } from "@/lib/hooks/use-geo";
import { useGeoPersonaResults } from "@/lib/hooks/use-geo-personas";
import { toPersonaEngineThreads } from "@/utils/geo-personas";

export function usePersonaConversation(
  organizationId: string,
  persona: GeoPersona | null,
  open: boolean,
  showConversation: boolean
) {
  const { data, isLoading, isFetching, refetch } = useGeoPersonaResults(
    organizationId,
    open ? persona?.id : undefined,
    open && showConversation
  );
  const startScan = useGeoStartScan(organizationId);
  const isScanning = useIsGeoScanning(organizationId);
  const wasScanning = useRef(isScanning);
  useEffect(() => {
    if (wasScanning.current && !isScanning && open) {
      refetch();
    }
    wasScanning.current = isScanning;
  }, [isScanning, open, refetch]);
  const [engine, setEngine] = useState<string | null>(null);
  const [playToken, setPlayToken] = useState(1);
  const [skipReplay, setSkipReplay] = useState(false);
  const reducedMotion = useReducedMotion();
  const threads = useMemo(
    () => toPersonaEngineThreads(data?.results ?? [], persona?.id),
    [data, persona?.id]
  );
  const active =
    threads.find((thread) => thread.engine === engine) ?? threads[0] ?? null;
  const progress = useAnswerReplay(
    showConversation && active ? active.turns : GEO_PERSONA_EMPTY_TURNS,
    playToken,
    Boolean(reducedMotion),
    skipReplay
  );
  const isWaitingForScan =
    Boolean(persona?.enabled) && (isScanning || startScan.isPending);
  const isConversationLoading =
    !active && (isLoading || isFetching || isWaitingForScan);
  return {
    startScan,
    isScanning,
    threads,
    active,
    progress,
    isWaitingForScan,
    isConversationLoading,
    setEngine,
    setPlayToken,
    setSkipReplay,
  };
}
