"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";

import { CompetitorDetailView } from "@/components/geo/competitor-detail-view";
import { CompetitorModal } from "@/components/geo/competitor-modal";

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
  return (
    <Suspense
      fallback={
        <CompetitorModal title="Competitor">
          <CompetitorDetailSkeleton />
        </CompetitorModal>
      }
    >
      <PageContent />
    </Suspense>
  );
}
