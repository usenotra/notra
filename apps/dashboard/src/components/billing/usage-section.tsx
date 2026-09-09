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
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { CreditTopupModal } from "@/components/billing/credit-topup-modal";
import { UsageBreakdownChart } from "@/components/billing/usage-breakdown-chart";
import { Button } from "@/components/button";
import {
  IntegrationCardDither,
  useIntegrationCardDither,
} from "@/components/integrations/integration-card-dither";
import {
  USAGE_ANSWERS_ACCENT,
  USAGE_FEATURE_SKELETON_KEYS,
  USAGE_METRIC_SKELETON_KEYS,
} from "@/constants/billing";
import { useAutumnRefreshListener } from "@/lib/hooks/use-autumn-refresh-listener";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";
import type {
  FeatureData,
  UsageBreakdownPoint,
  UsageLimitedFeatureRowProps,
  UsageRangeOption,
  UsageSectionBodyProps,
} from "@/types/hooks/billing";
import {
  aiAnswersFooter,
  aiAnswersHint,
  aiAnswersValue,
  featuresFromBalances,
  isRetentionFeature,
  limitedUsageFeatures,
  remainingCountLabel,
  unlimitedUsageFeatures,
  usageRetentionDays,
} from "@/utils/billing-usage";
import {
  formatCount,
  formatDollars,
  formatPercent,
  remainingBarColor,
  remainingPercent,
} from "@/utils/format";

function RemainingBar({
  label,
  remaining,
}: {
  label: string;
  remaining: number;
}) {
  return (
    <div
      aria-label={`${label}: ${formatPercent(remaining)}% remaining`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(remaining)}
      className="bg-muted h-2 w-full overflow-hidden rounded-full"
      role="progressbar"
    >
      <div
        className={cn(
          "duration-slower h-full rounded-full transition-[width]",
          remainingBarColor(remaining)
        )}
        style={{ width: `${remaining}%` }}
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
          <p className="text-3xl font-bold tracking-tight tabular-nums">
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
        <div className="grid gap-4 sm:grid-cols-2">
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
  const remaining = remainingPercent(feature.balance, feature.included);
  const used =
    feature.included !== null && feature.balance !== null
      ? Math.max(feature.included - feature.balance, 0)
      : 0;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium">{feature.name}</p>
            <Tooltip>
              <TooltipTrigger
                aria-label={`About ${feature.name}`}
                className="text-muted-foreground inline-flex size-6 items-center justify-center"
              >
                <HugeiconsIcon
                  className="size-3.5"
                  icon={InformationCircleIcon}
                />
              </TooltipTrigger>
              <TooltipContent>
                {formatCount(used)} used of {formatCount(feature.included ?? 0)}{" "}
                this cycle.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-muted-foreground mt-1 text-sm tabular-nums">
            {remainingCountLabel(feature)}
          </p>
        </div>
      </div>
      <RemainingBar label={feature.name} remaining={remaining} />
    </div>
  );
}

function UsageRetentionRow({ retentionDays }: { retentionDays: number }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">Log retention</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Logs are kept for {retentionDays} days.
        </p>
      </div>
      <div className="border-border bg-muted shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium">
        {retentionDays} days
      </div>
    </div>
  );
}

function UsageUnlimitedFeatureRow({ feature }: { feature: FeatureData }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{feature.name}</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Included in your plan without a usage cap.
        </p>
      </div>
      <div className="border-border bg-muted shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium">
        Unlimited
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

  const chartData = useMemo((): UsageBreakdownPoint[] => {
    if (!aggregatedList?.length) {
      return [];
    }
    return aggregatedList.map((row) => {
      const value = row.values?.[FEATURES.AI_ANSWERS];
      return {
        date: row.period,
        ai_answers: typeof value === "number" ? value : 0,
      };
    });
  }, [aggregatedList]);

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
  range,
  retentionDays,
  unlimitedFeatures,
}: UsageSectionBodyProps) {
  const showFeatureLimits =
    limitedFeatures.length > 0 ||
    hasRetentionFeature ||
    unlimitedFeatures.length > 0;

  return (
    <div className="space-y-8">
      {aiAnswersFeature || aiCreditsFeature ? (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Balance</h2>
            <p className="text-muted-foreground max-w-prose text-sm text-pretty">
              How much of each plan limit you have left this cycle.
            </p>
          </div>
          <div className="grid items-stretch gap-4 sm:grid-cols-2">
            {aiAnswersFeature ? (
              <BalanceCard
                accentColor={USAGE_ANSWERS_ACCENT}
                footer={aiAnswersFooter(aiAnswersFeature, aiAnswersRemaining)}
                hint={aiAnswersHint(aiAnswersFeature)}
                remaining={
                  aiAnswersFeature.unlimited ? null : aiAnswersRemaining
                }
                title="AI Answers remaining"
                value={aiAnswersValue(aiAnswersFeature)}
              />
            ) : null}
            {aiCreditsFeature ? (
              <BalanceCard
                accentColor="#8b5cf6"
                action={
                  <Button
                    aria-label="Top up credits"
                    onClick={onOpenTopup}
                    size="icon-sm"
                    variant="outline"
                  >
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                  </Button>
                }
                footer="Credits extend usage beyond your plan limits."
                title="Credits remaining"
                value={
                  aiCreditsFeature.balance !== null
                    ? formatDollars(aiCreditsFeature.balance)
                    : "-"
                }
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {hasAiAnswers ? (
        <UsageBreakdownChart
          data={chartData}
          loading={chartLoading}
          onRangeChange={onRangeChange}
          range={range}
        />
      ) : null}

      {showFeatureLimits ? (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">
              Feature limits
            </h2>
            <p className="text-muted-foreground max-w-prose text-sm text-pretty">
              {aiAnswersFeature
                ? "Other remaining quotas on your plan."
                : "Remaining quotas on your plan."}
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
      ) : null}
    </div>
  );
}
