"use client";

import { EmptyState } from "@/components/empty-state";
import { GeoSetupButton } from "@/components/geo/geo-setup-button";
import { PageContainer } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import type { GeoWriterNeedsSetupProps } from "@/types/components/geo-writer";

export function GeoWriterNeedsSetup({
  organizationId,
  title,
  description,
}: GeoWriterNeedsSetupProps) {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeader description={description} title={title} />
        <EmptyState
          action={<GeoSetupButton organizationId={organizationId} />}
          description="The writer uses your tracked prompts, competitors, and sitemap. Set up GEO tracking first."
          title="Set up GEO tracking"
        />
      </div>
    </PageContainer>
  );
}
