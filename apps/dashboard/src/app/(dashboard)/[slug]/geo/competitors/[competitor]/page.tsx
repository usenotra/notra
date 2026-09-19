import type { Metadata } from "next";
import { Suspense } from "react";

import { CompetitorDetailView } from "@/components/geo/competitor-detail-view";
import { PageContainer } from "@/components/layout/container";

import { CompetitorDetailSkeleton } from "../skeleton";

export const metadata: Metadata = {
  title: "Competitor",
};

export const instant = true;

async function PageContent({
  params,
}: {
  params: Promise<{ slug: string; competitor: string }>;
}) {
  const { slug, competitor } = await params;

  return (
    <CompetitorDetailView
      competitor={decodeURIComponent(competitor)}
      organizationSlug={slug}
      variant="page"
    />
  );
}

function Page({
  params,
}: {
  params: Promise<{ slug: string; competitor: string }>;
}) {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full px-4 lg:px-6">
        <Suspense fallback={<CompetitorDetailSkeleton />}>
          <PageContent params={params} />
        </Suspense>
      </div>
    </PageContainer>
  );
}
export default Page;
