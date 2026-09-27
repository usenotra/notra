import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { GeoPageGate } from "@/components/geo/geo-page-gate";

import { GeoPageSkeleton } from "../skeleton";
import PageClient from "./page-client";

export async function generateMetadata(): Promise<Metadata> {
  const tGeoShared = await getTranslations("geo.shared");
  return { title: tGeoShared("geoDirections") };
}

export const instant = true;

function Page() {
  return (
    <Suspense fallback={<GeoPageSkeleton />}>
      <GeoPageGate fallback={<GeoPageSkeleton />}>
        <PageClient />
      </GeoPageGate>
    </Suspense>
  );
}

export default Page;
