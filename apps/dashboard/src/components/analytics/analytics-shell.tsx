"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { type ReactNode, useEffect, useRef } from "react";
import { useTranslations } from "use-intl";

import { AnalyticsPageSkeleton } from "@/app/(dashboard)/[slug]/analytics/skeleton";
import { AccountFilter } from "@/components/analytics/account-filter";
import { useAnalyticsAccounts } from "@/components/analytics/analytics-context";
import { AnalyticsNav } from "@/components/analytics/analytics-nav";
import { ConnectAccountsButtons } from "@/components/analytics/connect-accounts-buttons";
import { SummaryStats } from "@/components/analytics/summary-stats";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateAnalyticsPreview } from "@/components/empty-state-preview";
import { PageContainer } from "@/components/layout/container";
import { ANALYTICS_VIEW_STATES } from "@/constants/integration-analytics";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useAnalyticsRange } from "@/lib/hooks/use-analytics-range";
import {
  useEngagementTimeseries,
  useSocialOverview,
} from "@/lib/hooks/use-social-analytics";
import type { AnalyticsViewState } from "@/types/analytics/integration-events";
import { accountSeriesKey } from "@/utils/analytics-charts";

function AnalyticsHeader({ organizationId }: { organizationId: string }) {
  const t = useTranslations("analytics.shell");
  const tCommon = useTranslations("common");
  return (
    <PageHeading
      description={t("description")}
      title={tCommon("labels.analytics")}
    >
      <ConnectAccountsButtons organizationId={organizationId} />
    </PageHeading>
  );
}

export function AnalyticsShell({ children }: { children: ReactNode }) {
  const t = useTranslations("analytics.shell");
  const tCommon = useTranslations("common");
  const {
    organizationId,
    organizationSlug,
    accounts,
    configured,
    isPending,
    toggleAccount,
    selectedKeys,
    visibleAccounts,
  } = useAnalyticsAccounts();

  const engagementRange = useAnalyticsRange("engagementRange");
  const { data: engagement } = useEngagementTimeseries(
    organizationId,
    engagementRange.range
  );
  const { isError: overviewFailed } = useSocialOverview(organizationId);
  const viewedRef = useRef(false);

  let viewState: AnalyticsViewState = ANALYTICS_VIEW_STATES.OK;
  if (overviewFailed) {
    viewState = ANALYTICS_VIEW_STATES.FLAG_OFF;
  } else if (accounts.length === 0) {
    viewState = ANALYTICS_VIEW_STATES.NO_ACCOUNTS;
  } else if (!configured) {
    viewState = ANALYTICS_VIEW_STATES.NOT_CONFIGURED;
  }

  useEffect(() => {
    if (isPending || !organizationId || viewedRef.current) {
      return;
    }
    viewedRef.current = true;
    trackEvent(POSTHOG_EVENTS.ANALYTICS_VIEWED, {
      state: viewState,
      account_count: accounts.length,
    });
  }, [isPending, organizationId, viewState, accounts.length]);

  const visiblePoints = (engagement?.points ?? []).filter((point) =>
    selectedKeys.has(accountSeriesKey(point.provider, point.providerAccountId))
  );

  if (isPending) {
    return <AnalyticsPageSkeleton />;
  }

  if (accounts.length === 0) {
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <PageHeading
            description={t("description")}
            title={tCommon("labels.analytics")}
          />
          <EmptyState
            action={<ConnectAccountsButtons organizationId={organizationId} />}
            description={t("emptyDescription")}
            preview={<EmptyStateAnalyticsPreview />}
            title={t("emptyTitle")}
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-4 px-4 lg:px-6">
        <header className="space-y-3">
          <AnalyticsHeader organizationId={organizationId} />
          <AccountFilter
            accounts={accounts}
            onToggle={toggleAccount}
            selectedKeys={selectedKeys}
          />
        </header>

        {!configured && (
          <p className="border-border text-muted-foreground rounded-md border px-3 py-2 font-mono text-[0.6875rem]">
            {t("notConfigured")}
          </p>
        )}

        <SummaryStats
          accounts={visibleAccounts}
          points={visiblePoints}
          rangeHint={engagementRange.hint}
        />

        <AnalyticsNav slug={organizationSlug} />

        <div className="mt-6">{children}</div>
      </div>
    </PageContainer>
  );
}
