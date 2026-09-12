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
  const projectId = normalizeGeoProjectId(projectParam) ?? initialProjectId;
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

  if (projectId !== hostScopeProjectId) {
    setHostScopeProjectId(projectId);
    setHostSuppressed(hostQuery.length > 0);
  }

  useEffect(() => {
    if (!hostSuppressed) {
      return;
    }
    if (hostQuery.length > 0) {
      void setHostQuery("");
      return;
    }
    setHostSuppressed(false);
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
