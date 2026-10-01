"use client";

import type { RealtimeSchema } from "@notra/ai/realtime";
import type { DemoRequestEvent } from "@notra/db/types/demo";
import { demoRequestChannel } from "@notra/db/utils/demo-channel";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtime } from "@upstash/realtime/client";
import { useCallback } from "react";

import { DEMO_REQUEST_FEED_LIMIT } from "@/constants/demo";
import { demoRequestEventSchema } from "@/schemas/demo";
import type { DemoRequestDetail, DemoSandboxInfo } from "@/types/demo";
import { demoInvalidationKeys } from "@/utils/demo-invalidation";
import { QUERY_KEYS } from "@/utils/query-keys";

const SANDBOX_STALE_MS = 30_000;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${url} failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function useDemoSandbox(enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.DEMO.sandbox,
    queryFn: () => fetchJson<DemoSandboxInfo>("/api/demo/sandbox/info"),
    enabled,
    staleTime: SANDBOX_STALE_MS,
  });
}

/** Moves the sandbox to the visitor's time zone. */
export function useSyncDemoTimeZone() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (timeZone: string) => {
      const response = await fetch("/api/demo/sandbox/timezone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeZone }),
      });
      if (!response.ok) {
        throw new Error(`Time zone sync failed with ${response.status}`);
      }
    },
    onSuccess: () =>
      client.invalidateQueries({ queryKey: QUERY_KEYS.DEMO.sandbox }),
  });
}

export function useDemoRequests(enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.DEMO.requests,
    queryFn: () => fetchJson<DemoRequestEvent[]>("/api/demo/requests"),
    enabled,
  });
}

export function useDemoRequestDetail(requestId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.DEMO.request(requestId ?? ""),
    queryFn: () =>
      fetchJson<DemoRequestDetail>(
        `/api/demo/requests/${encodeURIComponent(requestId ?? "")}`
      ),
    enabled: requestId !== null,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/**
 * Live feed: every demo-api request and UI action arrives over realtime,
 * lands at the top of the feed, and refreshes the dashboard data it touched.
 */
export function useDemoRequestStream(
  organizationId: string | null,
  onRequest: (event: DemoRequestEvent) => void
) {
  const client = useQueryClient();

  const handle = useCallback(
    (data: unknown) => {
      const parsed = demoRequestEventSchema.safeParse(data);
      if (!parsed.success) {
        return;
      }
      const event = parsed.data;
      client.setQueryData<DemoRequestEvent[]>(
        QUERY_KEYS.DEMO.requests,
        (current) =>
          [
            event,
            ...(current ?? []).filter((item) => item.id !== event.id),
          ].slice(0, DEMO_REQUEST_FEED_LIMIT)
      );
      void client.invalidateQueries({ queryKey: QUERY_KEYS.DEMO.sandbox });

      // UI actions already refresh their own queries.
      if (event.source !== "ui") {
        const keys = demoInvalidationKeys(event.path);
        if (keys) {
          for (const queryKey of keys) {
            void client.invalidateQueries({ queryKey });
          }
        } else {
          void client.invalidateQueries();
        }
      }
      onRequest(event);
    },
    [client, onRequest]
  );

  useRealtime<RealtimeSchema, "demo.request">({
    channels: organizationId ? [demoRequestChannel(organizationId)] : [],
    events: ["demo.request"],
    enabled: organizationId !== null,
    onData: ({ data }) => handle(data),
  });
}
