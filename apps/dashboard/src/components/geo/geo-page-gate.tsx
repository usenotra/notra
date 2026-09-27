"use client";

import { useParams } from "next/navigation";

import { GeoUpgradeGate } from "@/components/geo/geo-upgrade-gate";
import type { GeoPageGateProps } from "@/types/components/geo";

export function GeoPageGate({ children, fallback }: GeoPageGateProps) {
  const { slug } = useParams<{ slug: string }>();

  return (
    <GeoUpgradeGate fallback={fallback} slug={slug}>
      {children}
    </GeoUpgradeGate>
  );
}
