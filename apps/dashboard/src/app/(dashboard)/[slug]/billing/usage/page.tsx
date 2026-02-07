"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@notra/ui/components/ui/chart";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { useAggregateEvents, useCustomer } from "autumn-js/react";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { PageContainer } from "@/components/layout/container";
import { TitleCard } from "@/components/title-card";
import { FEATURES } from "@/lib/billing/constants";

const ranges = ["7d", "30d", "90d", "last_cycle"] as const;
type RangeOption = (typeof ranges)[number];

const chartConfig = {
  usage: {
    label: "Credits",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFeatureName(id: string): string {
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface FeatureData {
  id: string;
  name: string;
  balance: number | null;
  included: number | null;
  unlimited: boolean;
}

export default function BillingUsagePage() {
  const [range, setRange] = useState<RangeOption>("30d");
  const { customer, isLoading: customerLoading } = useCustomer();

  const {
    list,
    total,
    isLoading: usageLoading,
  } = useAggregateEvents({
    featureId: FEATURES.AI_CREDITS,
    range,
    binSize: "day",
  });

  const usageSeries = useMemo(() => {
    return (list ?? []).map((item) => {
      const usage = Number(item[FEATURES.AI_CREDITS] ?? 0);
      return {
        date: formatDateLabel(new Date(item.period)),
        usage,
      };
    });
  }, [list]);

  const totalUsage =
    typeof total?.[FEATURES.AI_CREDITS]?.sum === "number"
      ? (total?.[FEATURES.AI_CREDITS]?.sum ?? 0)
      : 0;

  // Extract all features from customer object
  const features = useMemo<FeatureData[]>(() => {
    if (!customer?.features) return [];

    return Object.entries(customer.features).map(([id, feature]) => {
      const balance =
        typeof feature?.balance === "number" ? feature.balance : null;
      const included =
        typeof feature?.included_usage === "number"
          ? feature.included_usage
          : null;
      const unlimited = feature?.unlimited === true;

      return {
        id,
        name: formatFeatureName(id),
        balance,
        included,
        unlimited,
      };
    });
  }, [customer?.features]);

  // Separate limited and unlimited features
  const limitedFeatures = features.filter(
    (f) => !f.unlimited && f.included !== null
  );
  const unlimitedFeatures = features.filter((f) => f.unlimited);

  // Find the AI credits feature for the hero card
  const aiCreditsFeature = features.find((f) => f.id === FEATURES.AI_CREDITS);

  if (customerLoading && !customer) {
    return (
      <PageContainer className="flex flex-1 flex-col gap-6 py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <div className="space-y-1">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-[360px] rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-1 flex-col gap-6 py-6">
      <div className="w-full space-y-8 px-4 lg:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-semibold text-2xl tracking-tight">Usage</h1>
            <p className="text-muted-foreground text-sm">
              Track your feature usage and remaining balances
            </p>
          </div>
          <Tabs
            onValueChange={(value) => setRange(value as RangeOption)}
            value={range}
          >
            <TabsList variant="line">
              {ranges.map((value) => (
                <TabsTrigger key={value} value={value}>
                  {value === "last_cycle" ? "Last cycle" : value.toUpperCase()}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Hero Stats - AI Credits */}
        {aiCreditsFeature && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TitleCard accentColor="#8b5cf6" heading="Credits Used">
              <div className="flex items-baseline gap-2">
                <p className="font-bold text-3xl tabular-nums tracking-tight">
                  {formatNumber(totalUsage)}
                </p>
                <p className="text-muted-foreground text-sm">
                  in selected period
                </p>
              </div>
            </TitleCard>
            <TitleCard accentColor="#10b981" heading="Credits Remaining">
              <div className="flex items-baseline gap-2">
                <p className="font-bold text-3xl tabular-nums tracking-tight">
                  {aiCreditsFeature.balance !== null
                    ? formatNumber(aiCreditsFeature.balance)
                    : "—"}
                </p>
                <p className="text-muted-foreground text-sm">
                  {aiCreditsFeature.included
                    ? `of ${formatNumber(aiCreditsFeature.included)}`
                    : "available"}
                </p>
              </div>
            </TitleCard>
          </div>
        )}

        {/* Limits Section */}
        {limitedFeatures.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-medium text-muted-foreground text-sm uppercase tracking-wider">
                Limits
              </h2>
            </div>
            <div className="divide-y rounded-xl border">
              {limitedFeatures.map((feature) => {
                const used =
                  feature.included !== null && feature.balance !== null
                    ? feature.included - feature.balance
                    : 0;
                const percent =
                  feature.included && feature.included > 0
                    ? Math.min((used / feature.included) * 100, 100)
                    : 0;

                return (
                  <div
                    className="flex items-center justify-between gap-4 p-4"
                    key={feature.id}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">
                        {feature.name}
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-foreground/70 transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums">
                        {feature.balance !== null
                          ? formatNumber(feature.balance)
                          : "—"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        of {formatNumber(feature.included ?? 0)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unlimited Features */}
        {unlimitedFeatures.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-medium text-muted-foreground text-sm uppercase tracking-wider">
                Unlimited Features
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {unlimitedFeatures.map((feature) => (
                <div
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
                  key={feature.id}
                >
                  <div className="size-1.5 rounded-full bg-emerald-500" />
                  <span className="font-medium text-sm">{feature.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Usage Over Time</CardTitle>
            <CardDescription>Daily AI credit consumption</CardDescription>
          </CardHeader>
          <CardContent>
            {usageLoading ? (
              <div className="flex h-[240px] items-center justify-center rounded-lg border border-border/60 border-dashed">
                <p className="text-muted-foreground text-sm">Loading...</p>
              </div>
            ) : usageSeries.length === 0 ? (
              <div className="flex h-[240px] items-center justify-center rounded-lg border border-border/60 border-dashed">
                <p className="text-muted-foreground text-sm">
                  No usage data for this period
                </p>
              </div>
            ) : (
              <ChartContainer className="h-[240px] w-full" config={chartConfig}>
                <AreaChart accessibilityLayer data={usageSeries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    axisLine={false}
                    dataKey="date"
                    fontSize={12}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    axisLine={false}
                    fontSize={12}
                    tickLine={false}
                    tickMargin={8}
                    width={40}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    cursor={{
                      stroke: "var(--border)",
                      strokeDasharray: "4 4",
                    }}
                  />
                  <defs>
                    <linearGradient
                      id="usage-gradient"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--color-usage)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--color-usage)"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="usage"
                    fill="url(#usage-gradient)"
                    stroke="var(--color-usage)"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
