"use client";

import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/empty-state";
import { GeoSetupButton } from "@/components/geo/geo-setup-button";
import { PageContainer } from "@/components/layout/container";
import type { GeoWriterNeedsSetupProps } from "@/types/components/geo-writer";

export function GeoWriterNeedsSetup({
  organizationId,
  title,
  description,
}: GeoWriterNeedsSetupProps) {
  const t = useTranslations("geo.writer.pageGate");
  const tGeoShared = useTranslations("geo.shared");
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </header>
        <EmptyState
          action={<GeoSetupButton organizationId={organizationId} />}
          description={t("description")}
          title={tGeoShared("setUpGeoTracking")}
        />
      </div>
    </PageContainer>
  );
}
