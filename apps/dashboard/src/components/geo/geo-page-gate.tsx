"use client";

import { GeoUpgradeGate } from "@/components/geo/geo-upgrade-gate";
import { useParams } from "@/lib/navigation";
import type { GeoPageGateProps } from "@/types/components/geo";

export function GeoPageGate({
  children,
  entitled,
  fallback,
}: GeoPageGateProps) {
  const { slug } = useParams<{ slug: string }>();

  return (
    <GeoUpgradeGate entitled={entitled} fallback={fallback} slug={slug}>
      {children}
    </GeoUpgradeGate>
  );
}
