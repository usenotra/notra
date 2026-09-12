"use client";

import { isKnownTrafficHost } from "@notra/geo-core/utils/geo-project-domains";
import { useEffect } from "react";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";

export function useGeoTrafficHostQuery(
  knownHosts: readonly string[] = [],
  isReady = false
) {
  const { trafficHost, setTrafficHost } = useGeoProjectScope();
  const knownHostKey = knownHosts.join("\n");

  useEffect(() => {
    if (!isReady || trafficHost.length === 0) {
      return;
    }
    const hosts = knownHostKey.length === 0 ? [] : knownHostKey.split("\n");
    if (!isKnownTrafficHost(trafficHost, hosts)) {
      setTrafficHost("");
    }
  }, [isReady, knownHostKey, setTrafficHost, trafficHost]);

  return [trafficHost, setTrafficHost] as const;
}
