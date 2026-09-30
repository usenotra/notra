"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { GeoUpgradeDialog } from "@/components/billing/geo-upgrade-dialog";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateCardsPreview } from "@/components/empty-state-preview";
import { PageContainer } from "@/components/layout/container";
import { PAYWALL_KINDS } from "@/constants/analytics-events";
import { EMPTY_STATE_CARD_COUNT } from "@/constants/empty-state";
import { trackEvent } from "@/lib/analytics/posthog-client";
import type { StudioUpgradeGateProps } from "@/types/dashboard/home";

export function StudioUpgradeGate({ slug }: StudioUpgradeGateProps) {
  const t = useTranslations("home");
  const tUpgrade = useTranslations("nav.upgrade");
  const [open, setOpen] = useState(false);

  return (
    <PageContainer className="flex flex-1 flex-col py-4 md:py-6">
      <EmptyState
        actionLabel={tUpgrade("upgradeNow")}
        className="my-auto"
        description={t("upgradeDescription")}
        onActionClick={() => {
          trackEvent(POSTHOG_EVENTS.PAYWALL_SHOWN, {
            kind: PAYWALL_KINDS.STUDIO_LOCKED,
            route: "/",
          });
          setOpen(true);
        }}
        preview={
          <EmptyStateCardsPreview
            columns={3}
            count={EMPTY_STATE_CARD_COUNT.content}
            variant="content"
          />
        }
        title={t("upgradeTitle")}
      />
      {open && (
        <GeoUpgradeDialog
          entry="studio"
          onOpenChange={setOpen}
          open
          slug={slug}
        />
      )}
    </PageContainer>
  );
}
