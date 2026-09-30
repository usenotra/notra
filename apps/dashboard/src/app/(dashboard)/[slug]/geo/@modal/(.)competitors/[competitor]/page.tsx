"use client";

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Suspense } from "react";

import { CompetitorDetailView } from "@/components/geo/competitor-detail-view";
import { CompetitorModal } from "@/components/geo/competitor-modal";
import { GeoPageGate } from "@/components/geo/geo-page-gate";

import { CompetitorDetailSkeleton } from "../../../competitors/skeleton";

function PageContent() {
  const { slug, competitor } = useParams<{
    slug: string;
    competitor: string;
  }>();
  const name = decodeURIComponent(competitor ?? "");

  return (
    <CompetitorModal title={name}>
      <CompetitorDetailView competitor={name} organizationSlug={slug ?? ""} />
    </CompetitorModal>
  );
}

export default function Page() {
  const tGeoShared = useTranslations("geo.shared");
  const fallback = (
    <CompetitorModal title={tGeoShared("competitor")}>
      <CompetitorDetailSkeleton />
    </CompetitorModal>
  );
  return (
    <Suspense fallback={fallback}>
      <GeoPageGate fallback={fallback}>
        <PageContent />
      </GeoPageGate>
    </Suspense>
  );
}
