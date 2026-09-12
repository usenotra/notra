"use client";

import type { GeoPersona } from "@notra/geo-core/types/geo-personas";
import { useMemo, useState } from "react";

import {
  useGeoPersonaResults,
  useGeoPersonaRun,
} from "@/lib/hooks/use-geo-personas";
import { toPersonaEngineThreads } from "@/utils/geo-personas";

export function usePersonaConversation(
  organizationId: string,
  persona: GeoPersona | null,
  open: boolean,
  showConversation: boolean
) {
  const { data, isLoading, isFetching } = useGeoPersonaResults(
    organizationId,
    open ? persona?.id : undefined,
    open && showConversation
  );
  const runPersona = useGeoPersonaRun(organizationId);
  const [engine, setEngine] = useState<string | null>(null);
  const threads = useMemo(
    () => toPersonaEngineThreads(data?.results ?? [], persona?.id),
    [data, persona?.id]
  );
  const active =
    threads.find((thread) => thread.engine === engine) ?? threads[0] ?? null;
  const isWaitingForScan = runPersona.isPending;
  const isConversationLoading =
    !active && (isLoading || isFetching || isWaitingForScan);
  return {
    runPersona,
    threads,
    active,
    isWaitingForScan,
    isConversationLoading,
    setEngine,
  };
}
