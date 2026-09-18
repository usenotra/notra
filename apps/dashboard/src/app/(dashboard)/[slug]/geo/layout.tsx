import { Suspense } from "react";

import { GeoCatalogWarmer } from "@/components/geo/geo-catalog-warmer";
import { GeoUpgradeGate } from "@/components/geo/geo-upgrade-gate";
import type { GeoLayoutProps } from "@/types/geo";

import { GeoProjectScope } from "./geo-project-scope";

export const instant = true;

export default function GeoLayout({ children, modal, params }: GeoLayoutProps) {
  return (
    <Suspense
      fallback={
        <>
          {children}
          {modal}
        </>
      }
    >
      <GeoLayoutProviders params={params}>
        {children}
        {modal}
      </GeoLayoutProviders>
    </Suspense>
  );
}

async function GeoLayoutProviders({
  children,
  params,
}: Pick<GeoLayoutProps, "children" | "params">) {
  const { slug } = await params;
  return (
    <>
      <GeoCatalogWarmer organizationSlug={slug} />
      <GeoProjectScope slug={slug}>
        <GeoUpgradeGate slug={slug}>{children}</GeoUpgradeGate>
      </GeoProjectScope>
    </>
  );
}
