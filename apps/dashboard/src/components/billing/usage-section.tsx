"use client";

import { Add01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { FEATURES } from "@notra/ai/billing/features";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { cn } from "@notra/ui/lib/utils";
import { keepPreviousData } from "@tanstack/react-query";
import { useAggregateEvents } from "autumn-js/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

import { CreditTopupModal } from "@/components/billing/credit-topup-modal";
import { Button } from "@/components/button";
import {
  IntegrationCardDither,
  useIntegrationCardDither,
} from "@/components/integrations/integration-card-dither";
import {
  USAGE_ANSWERS_ACCENT,
  USAGE_FEATURE_SKELETON_KEYS,
  USAGE_METRIC_SKELETON_KEYS,
  USAGE_PULL_REQUEST_CREDITS_ACCENT,
} from "@/constants/billing";
import { useAutumnRefreshListener } from "@/lib/hooks/use-autumn-refresh-listener";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";
import { useUsageFeatureName } from "@/lib/hooks/use-usage-feature-name";
import type {
  FeatureData,
  UsageLimitedFeatureRowProps,
  UsageRangeOption,
  UsageSectionBodyProps,
} from "@/types/hooks/billing";
import {
  creditsValue,
  featuresFromBalances,
  isRetentionFeature,
  limitedUsageFeatures,
  unlimitedUsageFeatures,
  usageBreakdownPoints,
  usageRetentionDays,
} from "@/utils/billing-usage";
import {
  formatCount,
  formatPercent,
  remainingBarColor,
  remainingPercent,
} from "@/utils/format";

const UsageBreakdownChart = dynamic(
  () =>
    import("@/components/billing/usage-breakdown-chart").then(
      (mod) => mod.UsageBreakdownChart
    ),
  {
    loading: () => <Skeleton className="h-[280px] w-full rounded-lg" />,
  }
);

function RemainingBar({
  label,
  remaining,
}: {
  label: string;
  remaining: number;
}) {
  const t = useTranslations("billing.usage");
  const locale = useLocale();
  return (
    <div
      aria-label={t("remainingAria", {
        label,
        percent: formatPercent(remaining, locale),
      })}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(remaining)}
      className="bg-muted h-2 w-full overflow-hidden rounded-full"
      role="progressbar"
    >
      <div
        className={cn(
          "duration-slower transition-width h-full w-(--remaining) rounded-full",
          remainingBarColor(remaining)
        )}
        style={{ "--remaining": `${remaining}%` } as CSSProperties}
      />
    </div>
  );
}

function BalanceCard({
  title,
  value,
  hint,
  footer,
  remaining,
  action,
  accentColor,
}: {
  title: string;
  value: string;
  hint?: string;
  footer?: string;
  remaining?: number | null;
  action?: ReactNode;
  accentColor: string;
}) {
  const dither = useIntegrationCardDither();

  return (
    <TitleCard
      {...dither.interactionProps}
      accentColor={accentColor}
      action={action}
      className="h-full min-w-0"
      footer={
        footer ? (
          <p className="text-muted-foreground text-xs text-pretty">{footer}</p>
        ) : undefined
      }
      footerClassName="border-t-0 pt-0"
      heading={title}
      hoverBackground={
        <IntegrationCardDither active={dither.active} color={accentColor} />
      }
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <p
            className="min-w-0 truncate text-3xl font-bold tracking-tight tabular-nums"
            title={value}
          >
            {value}
          </p>
          {hint ? (
            <p className="text-muted-foreground text-sm text-pretty">{hint}</p>
          ) : null}
        </div>
        {remaining != null ? (
          <RemainingBar label={title} remaining={remaining} />
        ) : null}
      </div>
    </TitleCard>
  );
}

function UsageSectionSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {USAGE_METRIC_SKELETON_KEYS.map((key) => (
            <TitleCard heading={<Skeleton className="h-5 w-32" />} key={key}>
              <Skeleton className="h-8 w-28" />
            </TitleCard>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="divide-y rounded-xl border">
          {USAGE_FEATURE_SKELETON_KEYS.map((key) => (
            <div className="flex flex-col gap-3 p-4" key={key}>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-[280px] rounded-xl" />
    </div>
  );
}

function UsageLimitedFeatureRow({ feature }: UsageLimitedFeatureRowProps) {
  const t = useTranslations("billing.usage");
  const locale = useLocale();
  const featureName = useUsageFeatureName()(feature);
  const remaining = remainingPercent(feature.balance, feature.included);
  const used =
    feature.included !== null && feature.balance !== null
      ? Math.max(feature.included - feature.balance, 0)
      : null;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p
              className="min-w-0 truncate text-sm font-medium"
              title={featureName}
            >
              {featureName}
            </p>
            <Tooltip>
              <TooltipTrigger
                aria-label={t("about", { name: featureName })}
                className="text-muted-foreground inline-flex size-6 items-center justify-center"
              >
                <HugeiconsIcon
                  className="size-3.5"
                  icon={InformationCircleIcon}
                />
              </TooltipTrigger>
              <TooltipContent>
                {used !== null
                  ? t("usedOfCycle", {
                      used: formatCount(used, locale),
                      included: formatCount(feature.included ?? 0, locale),
                    })
                  : t("includedCycle", {
                      included: formatCount(feature.included ?? 0, locale),
                    })}
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-muted-foreground mt-1 text-sm tabular-nums">
            {feature.balance !== null
              ? t("remainingOf", {
                  balance: formatCount(feature.balance, locale),
                  included: formatCount(feature.included ?? 0, locale),
                })
              : t("remainingOfUnknown", {
                  included: formatCount(feature.included ?? 0, locale),
                })}
          </p>
        </div>
      </div>
      {remaining !== null ? (
        <RemainingBar label={featureName} remaining={remaining} />
      ) : null}
    </div>
  );
}

function UsageRetentionRow({ retentionDays }: { retentionDays: number }) {
  const t = useTranslations("billing.usage");
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{t("logRetention")}</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("logRetentionDescription", { days: retentionDays })}
        </p>
      </div>
      <div className="border-border bg-muted shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium">
        {t("days", { days: retentionDays })}
      </div>
    </div>
  );
}

function UsageUnlimitedFeatureRow({ feature }: { feature: FeatureData }) {
  const t = useTranslations("billing.usage");
  const featureName = useUsageFeatureName()(feature);
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{featureName}</p>
        <p className="text-muted-foreground mt-1 text-sm">{t("noCap")}</p>
      </div>
      <div className="border-border bg-muted shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium">
        {t("unlimited")}
      </div>
    </div>
  );
}

export function UsageSection() {
  const [range, setRange] = useState<UsageRangeOption>("30d");
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupSuccess, setTopupSuccess] = useState(false);
  const {
    data: customer,
    isLoading: customerLoading,
    refetch,
  } = useBillingCustomer({
    expand: ["balances.feature"],
  });
  useAutumnRefreshListener(refetch);

  const hasAiAnswers = Boolean(customer?.balances?.[FEATURES.AI_ANSWERS]);
  const { list: aggregatedList, isLoading: usageLoading } = useAggregateEvents({
    featureId: FEATURES.AI_ANSWERS,
    range,
    binSize: "day",
    queryOptions: {
      enabled: hasAiAnswers,
      placeholderData: keepPreviousData,
    },
  });

  const chartData = usageBreakdownPoints(aggregatedList);

  if (customerLoading && !customer) {
    return <UsageSectionSkeleton />;
  }

  const features = featuresFromBalances(customer?.balances);
  const aiAnswersFeature = features.find(
    (feature) => feature.id === FEATURES.AI_ANSWERS
  );
  const aiCreditsFeature = features.find(
    (feature) => feature.id === FEATURES.AI_CREDITS
  );
  const pullRequestCreditsFeature = features.find(
    (feature) => feature.id === FEATURES.PULL_REQUEST_CREDITS
  );

  return (
    <>
      <UsageSectionBody
        aiAnswersFeature={aiAnswersFeature}
        aiAnswersRemaining={remainingPercent(
          aiAnswersFeature?.balance ?? null,
          aiAnswersFeature?.included ?? null
        )}
        aiCreditsFeature={aiCreditsFeature}
        chartData={chartData}
        chartLoading={usageLoading && chartData.length === 0}
        hasAiAnswers={hasAiAnswers}
        hasRetentionFeature={features.some(isRetentionFeature)}
        limitedFeatures={limitedUsageFeatures(features)}
        onOpenTopup={() => {
          setTopupSuccess(false);
          setTopupOpen(true);
        }}
        onRangeChange={setRange}
        pullRequestCreditsFeature={pullRequestCreditsFeature}
        range={range}
        retentionDays={usageRetentionDays(features)}
        unlimitedFeatures={unlimitedUsageFeatures(features)}
      />
      <CreditTopupModal
        onOpenChange={(open) => {
          setTopupOpen(open);
          if (!open) {
            setTopupSuccess(false);
          }
        }}
        onSuccess={() => {
          setTopupSuccess(true);
          void refetch();
        }}
        open={topupOpen}
        success={topupSuccess}
      />
    </>
  );
}

function UsageBalanceSection({
  aiAnswersFeature,
  aiAnswersRemaining,
  aiCreditsFeature,
  onOpenTopup,
  pullRequestCreditsFeature,
}: Pick<
  UsageSectionBodyProps,
  | "aiAnswersFeature"
  | "aiAnswersRemaining"
  | "aiCreditsFeature"
  | "onOpenTopup"
  | "pullRequestCreditsFeature"
>) {
  const t = useTranslations("billing.usage");
  const tCommon = useTranslations("common");
  const tBillingShared = useTranslations("billing.shared");
  const locale = useLocale();
  const format = useFormatter();
  const formatResetDate = (timestamp: number) =>
    format.dateTime(new Date(timestamp), {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  const aiAnswersFooter = (feature: FeatureData, remaining: number | null) => {
    if (feature.unlimited) {
      return t("noCap");
    }
    if (remaining === null) {
      return feature.nextResetAt === null
        ? undefined
        : t("resets", { date: formatResetDate(feature.nextResetAt) });
    }
    if (feature.nextResetAt === null) {
      return t("remainingPercent", {
        percent: formatPercent(remaining, locale),
      });
    }
    return t("remainingPercentResets", {
      percent: formatPercent(remaining, locale),
      date: formatResetDate(feature.nextResetAt),
    });
  };
  const aiAnswersValue = (feature: FeatureData) => {
    if (feature.unlimited) {
      return t("unlimited");
    }
    return feature.balance !== null
      ? formatCount(feature.balance, locale)
      : "-";
  };
  const aiAnswersHint = (feature: FeatureData) =>
    feature.unlimited || feature.included === null
      ? undefined
      : t("ofThisCycle", { included: formatCount(feature.included, locale) });
  const cardCount = [
    aiAnswersFeature,
    aiCreditsFeature,
    pullRequestCreditsFeature,
  ].filter(Boolean).length;
  if (cardCount === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("balanceTitle")}
        </h2>
        <p className="text-muted-foreground max-w-prose text-sm text-pretty">
          {t("balanceDescription")}
        </p>
      </div>
      <div
        className={cn(
          "grid items-stretch gap-4 sm:grid-cols-2",
          cardCount > 2 && "lg:grid-cols-3"
        )}
      >
        {aiAnswersFeature ? (
          <BalanceCard
            accentColor={USAGE_ANSWERS_ACCENT}
            footer={aiAnswersFooter(aiAnswersFeature, aiAnswersRemaining)}
            hint={aiAnswersHint(aiAnswersFeature)}
            remaining={aiAnswersFeature.unlimited ? null : aiAnswersRemaining}
            title={t("aiAnswersRemaining")}
            value={aiAnswersValue(aiAnswersFeature)}
          />
        ) : null}
        {aiCreditsFeature ? (
          <BalanceCard
            accentColor="#8b5cf6"
            action={
              <Button
                aria-label={tCommon("labels.topUpCredits")}
                onClick={onOpenTopup}
                size="icon-sm"
                variant="outline"
              >
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
              </Button>
            }
            footer={t("creditsFooter")}
            title={t("creditsRemaining")}
            value={creditsValue(aiCreditsFeature, locale)}
          />
        ) : null}
        {pullRequestCreditsFeature ? (
          <BalanceCard
            accentColor={USAGE_PULL_REQUEST_CREDITS_ACCENT}
            footer={t("pullRequestFooter")}
            title={tBillingShared("pullRequestCredits")}
            value={creditsValue(pullRequestCreditsFeature, locale)}
          />
        ) : null}
      </div>
    </section>
  );
}

function UsageFeatureLimitsSection({
  aiAnswersFeature,
  hasRetentionFeature,
  limitedFeatures,
  retentionDays,
  unlimitedFeatures,
}: Pick<
  UsageSectionBodyProps,
  | "aiAnswersFeature"
  | "hasRetentionFeature"
  | "limitedFeatures"
  | "retentionDays"
  | "unlimitedFeatures"
>) {
  const t = useTranslations("billing.usage");
  if (
    limitedFeatures.length === 0 &&
    !hasRetentionFeature &&
    unlimitedFeatures.length === 0
  ) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("featureLimits")}
        </h2>
        <p className="text-muted-foreground max-w-prose text-sm text-pretty">
          {aiAnswersFeature ? t("otherQuotas") : t("quotas")}
        </p>
      </div>
      <div className="divide-y rounded-xl border">
        {limitedFeatures.map((feature) => (
          <UsageLimitedFeatureRow feature={feature} key={feature.id} />
        ))}
        {hasRetentionFeature ? (
          <UsageRetentionRow retentionDays={retentionDays} />
        ) : null}
        {unlimitedFeatures.map((feature) => (
          <UsageUnlimitedFeatureRow feature={feature} key={feature.id} />
        ))}
      </div>
    </section>
  );
}

function UsageSectionBody({
  aiAnswersFeature,
  aiAnswersRemaining,
  aiCreditsFeature,
  chartData,
  chartLoading,
  hasAiAnswers,
  hasRetentionFeature,
  limitedFeatures,
  onOpenTopup,
  onRangeChange,
  pullRequestCreditsFeature,
  range,
  retentionDays,
  unlimitedFeatures,
}: UsageSectionBodyProps) {
  return (
    <div className="space-y-8">
      <UsageBalanceSection
        aiAnswersFeature={aiAnswersFeature}
        aiAnswersRemaining={aiAnswersRemaining}
        aiCreditsFeature={aiCreditsFeature}
        onOpenTopup={onOpenTopup}
        pullRequestCreditsFeature={pullRequestCreditsFeature}
      />
      {hasAiAnswers ? (
        <UsageBreakdownChart
          data={chartData}
          loading={chartLoading}
          onRangeChange={onRangeChange}
          range={range}
        />
      ) : null}
      <UsageFeatureLimitsSection
        aiAnswersFeature={aiAnswersFeature}
        hasRetentionFeature={hasRetentionFeature}
        limitedFeatures={limitedFeatures}
        retentionDays={retentionDays}
        unlimitedFeatures={unlimitedFeatures}
      />
    </div>
  );
}
