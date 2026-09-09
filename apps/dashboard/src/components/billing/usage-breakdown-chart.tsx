"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@notra/ui/components/ui/chart";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  XAxis,
  YAxis,
} from "recharts";

import {
  USAGE_ANSWERS_CHART_CONFIG,
  USAGE_CHART_ACCENT,
  USAGE_RANGE_TAB_LABELS,
  USAGE_RANGES,
} from "@/constants/billing";
import type { UsageBreakdownChartProps } from "@/types/hooks/billing";
import { formatCount, formatShortDate, isCreditRange } from "@/utils/format";

export function UsageBreakdownChart({
  data,
  loading,
  range,
  onRangeChange,
}: UsageBreakdownChartProps) {
  return (
    <TitleCard
      accentClassName="duration-0"
      accentColor={USAGE_CHART_ACCENT}
      action={
        <Tabs
          onValueChange={(value) => {
            if (isCreditRange(value, USAGE_RANGES)) {
              onRangeChange(value);
            }
          }}
          value={range}
        >
          <TabsList aria-label="Usage range">
            {USAGE_RANGES.map((value) => (
              <TabsTrigger key={value} value={value}>
                {USAGE_RANGE_TAB_LABELS[value]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
      className="min-w-0"
      heading="Usage breakdown"
      headingAs="h2"
    >
      <UsageBreakdownChartBody data={data} loading={loading} />
    </TitleCard>
  );
}

function UsageBreakdownChartBody({
  data,
  loading,
}: Pick<UsageBreakdownChartProps, "data" | "loading">) {
  const gradientId = `ai-answers-bar-${useId().replaceAll(":", "")}`;

  if (loading) {
    return <Skeleton className="h-[240px] w-full rounded-lg" />;
  }

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[240px] items-center justify-center text-sm">
        No AI Answers usage in this period
      </div>
    );
  }

  return (
    <ChartContainer
      className="aspect-auto h-[240px] w-full"
      config={USAGE_ANSWERS_CHART_CONFIG}
    >
      <BarChart
        accessibilityLayer
        data={data}
        isAnimationActive={false}
        margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-ai_answers)"
              stopOpacity={1}
            />
            <stop
              offset="100%"
              stopColor="var(--color-ai_answers)"
              stopOpacity={0.18}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          className="stroke-border/20"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          axisLine={false}
          className="text-muted-foreground/60 text-xs"
          dataKey="date"
          minTickGap={32}
          tickFormatter={(value: number) => formatShortDate(value)}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          axisLine={false}
          className="text-muted-foreground/60 text-xs"
          tickFormatter={(value: number) => formatCount(value)}
          tickLine={false}
          tickMargin={8}
          width={56}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              indicator="dot"
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload as
                  | UsageBreakdownChartProps["data"][number]
                  | undefined;
                return item?.date ? formatShortDate(item.date) : "";
              }}
            />
          }
          cursor={{ fill: "var(--foreground)", fillOpacity: 0.06 }}
        />
        <Bar
          activeBar={
            <Rectangle fill="var(--color-ai_answers)" radius={[4, 4, 0, 0]} />
          }
          dataKey="ai_answers"
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
