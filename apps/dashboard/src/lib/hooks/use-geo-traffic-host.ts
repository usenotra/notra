"use client";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";

export function useGeoTrafficHostQuery() {
  const { trafficHost, setTrafficHost } = useGeoProjectScope();
  return [trafficHost, setTrafficHost] as const;
}
