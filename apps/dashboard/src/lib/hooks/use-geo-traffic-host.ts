"use client";

import { GEO_TRAFFIC_HOST_PARAM } from "@notra/geo-core/constants/geo";
import { isKnownTrafficHost } from "@notra/geo-core/utils/geo-project-domains";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useRef } from "react";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";

export function useGeoTrafficHostQuery(
  knownHosts: readonly string[] = [],
  isReady = false
) {
  const { projectId } = useGeoProjectScope();
  const [hostQuery, setHostQuery] = useQueryState(
    GEO_TRAFFIC_HOST_PARAM,
    parseAsString.withDefault("").withOptions({ clearOnDefault: true })
  );
  const previousProjectId = useRef(projectId);
  const knownHostKey = knownHosts.join("\n");

  useEffect(() => {
    if (previousProjectId.current === projectId) {
      return;
    }
    previousProjectId.current = projectId;
    if (hostQuery.length > 0) {
      void setHostQuery("");
    }
  }, [hostQuery, projectId, setHostQuery]);

  useEffect(() => {
    if (!isReady || hostQuery.length === 0) {
      return;
    }
    const hosts = knownHostKey.length === 0 ? [] : knownHostKey.split("\n");
    if (!isKnownTrafficHost(hostQuery, hosts)) {
      void setHostQuery("");
    }
  }, [hostQuery, isReady, knownHostKey, setHostQuery]);

  return [hostQuery, setHostQuery] as const;
}
