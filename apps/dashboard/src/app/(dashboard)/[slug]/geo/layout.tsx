import { Suspense } from "react";

import { GeoCatalogWarmer } from "@/components/geo/geo-catalog-warmer";
import { GeoUpgradeGate } from "@/components/geo/geo-upgrade-gate";
import type { GeoLayoutProps } from "@/types/geo";

import { GeoProjectScope } from "./geo-project-scope";
import { GeoPageSkeleton } from "./skeleton";

export default async function GeoLayout({
  children,
  modal,
  params,
}: GeoLayoutProps) {
  const { slug } = await params;
  return (
    <>
      <GeoCatalogWarmer organizationSlug={slug} />
      <Suspense fallback={<GeoPageSkeleton />}>
        <GeoProjectScope slug={slug}>
          <GeoUpgradeGate fallback={<GeoPageSkeleton />} slug={slug}>
            {children}
            {modal}
          </GeoUpgradeGate>
        </GeoProjectScope>
      </Suspense>
    </>
  );
}
