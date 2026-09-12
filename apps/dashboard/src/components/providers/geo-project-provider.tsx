"use client";

import { GEO_TRAFFIC_HOST_PARAM } from "@notra/geo-core/constants/geo";
import { parseAsString, useQueryState } from "nuqs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";
import type {
  GeoProjectContextValue,
  GeoProjectProviderProps,
  GeoProjectQueryProviderProps,
} from "@/types/geo";
import { normalizeGeoProjectId } from "@/utils/geo-hydration";

function ignoreTrafficHost(_value: string): void {
  // Onboarding and other unkeyed trees do not share the traffic host URL.
}

const GeoProjectContext = createContext<GeoProjectContextValue>({
  projectId: undefined,
  trafficHost: "",
  setTrafficHost: ignoreTrafficHost,
});

export function GeoProjectProvider({
  projectId,
  children,
  trafficHost = "",
  setTrafficHost = ignoreTrafficHost,
}: GeoProjectProviderProps) {
  const value = useMemo(
    () => ({ projectId, trafficHost, setTrafficHost }),
    [projectId, setTrafficHost, trafficHost]
  );
  return (
    <GeoProjectContext.Provider key={projectId ?? ""} value={value}>
      {children}
    </GeoProjectContext.Provider>
  );
}

export function GeoProjectQueryProvider({
  initialProjectId,
  children,
}: GeoProjectQueryProviderProps) {
  const [projectParam] = useGeoProjectQueryState();
  // The sidebar writes the same id into the URL once `projectsList` resolves;
  // starting from the server-resolved value keeps the scope (and every query
  // key derived from it) stable across that rewrite. An empty `?project=` is
  // normalised away so the client falls back exactly like the server does.
  // Layouts cannot read search params, so the first client render may replace
  // `initialProjectId` with `?project=` — that is hydration, not a switch.
  const urlProjectId = normalizeGeoProjectId(projectParam);
  const projectId = urlProjectId ?? initialProjectId;
  const [hostQuery, setHostQuery] = useQueryState(
    GEO_TRAFFIC_HOST_PARAM,
    parseAsString.withDefault("").withOptions({ clearOnDefault: true })
  );
  const setTrafficHost = useCallback(
    (value: string) => {
      void setHostQuery(value);
    },
    [setHostQuery]
  );
  const [hostScopeProjectId, setHostScopeProjectId] = useState(projectId);
  const [hostSuppressed, setHostSuppressed] = useState(false);
  const [seenUrlProject, setSeenUrlProject] = useState(
    () => urlProjectId !== undefined
  );

  // Mark the URL as established even when `?project=` matches the fallback.
  // The sidebar often writes that same id; if we wait for a mismatch, the
  // next real switch still looks like hydration and keeps the previous host.
  // `isHydrationAlignment` below still reads the pre-update flag so a first
  // paint of `?project=B` vs fallback `A` does not clear `host`.
  if (urlProjectId !== undefined && !seenUrlProject) {
    setSeenUrlProject(true);
  }

  if (projectId !== hostScopeProjectId) {
    const isHydrationAlignment = urlProjectId !== undefined && !seenUrlProject;
    setHostScopeProjectId(projectId);
    if (!isHydrationAlignment && hostQuery.length > 0) {
      setHostSuppressed(true);
    }
  }

  if (hostSuppressed && hostQuery.length === 0) {
    setHostSuppressed(false);
  }

  useEffect(() => {
    if (!hostSuppressed || hostQuery.length === 0) {
      return;
    }
    void setHostQuery("");
  }, [hostQuery, hostSuppressed, setHostQuery]);

  const trafficHost = hostSuppressed ? "" : hostQuery;

  return (
    <GeoProjectProvider
      projectId={projectId}
      setTrafficHost={setTrafficHost}
      trafficHost={trafficHost}
    >
      {children}
    </GeoProjectProvider>
  );
}

export function useGeoProjectScope(): GeoProjectContextValue {
  return useContext(GeoProjectContext);
}
