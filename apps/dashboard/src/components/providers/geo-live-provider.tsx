"use client";

import type { RealtimeSchema } from "@notra/ai/realtime";
import {
  GEO_LIVE_INVALIDATE_THROTTLE_MS,
  GEO_LIVE_MAX_FAILED_CONNECTS,
  GEO_LIVE_PAUSE_AFTER_FAILURES_MS,
} from "@notra/geo-core/constants/geo";
import { geoLiveChannel } from "@notra/geo-core/utils/geo-live";
import { useThrottledCallback } from "@tanstack/react-pacer";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtime } from "@upstash/realtime/client";
import { createContext, useContext, useEffect, useState } from "react";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { GeoLiveProviderProps } from "@/types/geo";
import {
  invalidateGeoTrafficQueries,
  isGeoLiveEventInScope,
} from "@/utils/geo-live";
import { invalidateGeoScanResultQueries } from "@/utils/geo-scan-results";

const GeoLiveContext = createContext(false);

/**
 * Subscribes the GEO pages to `geo:{orgId}`. Ingest announces new AI traffic
 * once Tinybird can serve it, and scans announce start, every persisted batch
 * and completion, so traffic and visibility refetch within seconds. Polling
 * hooks read `useGeoLive()` and fall back to their short intervals only while
 * the stream is down.
 */
export function GeoLiveProvider({
  organizationId,
  children,
}: GeoLiveProviderProps) {
  const queryClient = useQueryClient();
  const { projectId } = useGeoProjectScope();
  // @upstash/realtime 1.x resets its retry counter inside every reconnect, so
  // `maxReconnectAttempts` never trips and a failing /api/realtime (expired
  // session, outage) is retried every second for as long as the tab is open.
  // Count connects that never opened and step back for a while instead:
  // dropping the last subscription is the one thing that stops its loop.
  const [failedConnects, setFailedConnects] = useState(0);
  const paused = failedConnects >= GEO_LIVE_MAX_FAILED_CONNECTS;
  const throttle = {
    wait: GEO_LIVE_INVALIDATE_THROTTLE_MS,
    leading: true,
    trailing: true,
  };
  const refreshTraffic = useThrottledCallback(() => {
    invalidateGeoTrafficQueries(queryClient, {
      organizationId,
      projectId,
    }).catch(() => undefined);
  }, throttle);
  const refreshVisibility = useThrottledCallback(() => {
    const input = { organizationId, projectId };
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.settings.key({ input }),
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.personasActivity.key({ input }),
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.personaResults.key({ input }),
      }),
      invalidateGeoScanResultQueries(queryClient, input),
    ]).catch(() => undefined);
  }, throttle);

  const { status } = useRealtime<
    RealtimeSchema,
    "geo.traffic" | "geo.visibility"
  >({
    channels: [geoLiveChannel(organizationId)],
    events: ["geo.traffic", "geo.visibility"],
    enabled: organizationId.length > 0 && !paused,
    onData: (payload) => {
      if (payload.event === "geo.traffic") {
        if (isGeoLiveEventInScope(payload.data.projectIds, projectId)) {
          refreshTraffic();
        }
        return;
      }
      if (isGeoLiveEventInScope([payload.data.projectId], projectId)) {
        refreshVisibility();
      }
    },
  });

  // Adjusted during render ("state from previous props"): every attempt is a
  // connecting → disconnected/error transition, a success resets the count.
  const [previousStatus, setPreviousStatus] = useState(status);
  if (status !== previousStatus) {
    setPreviousStatus(status);
    if (status === "connected") {
      setFailedConnects(0);
    } else if (previousStatus === "connecting" && status !== "connecting") {
      setFailedConnects((count) => count + 1);
    }
  }

  useEffect(() => {
    if (!paused) {
      return;
    }
    // Polling keeps the page current meanwhile (the stream counts as down).
    const resume = setTimeout(
      () => setFailedConnects(0),
      GEO_LIVE_PAUSE_AFTER_FAILURES_MS
    );
    return () => clearTimeout(resume);
  }, [paused]);

  return (
    <GeoLiveContext.Provider value={status === "connected"}>
      {children}
    </GeoLiveContext.Provider>
  );
}

/** True while GEO live updates stream in; polling can back off. */
export function useGeoLive(): boolean {
  return useContext(GeoLiveContext);
}
