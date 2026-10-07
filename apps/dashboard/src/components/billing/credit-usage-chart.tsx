"use client";

import { FEATURES } from "@notra/ai/billing/features";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@notra/ui/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useFormatter, useLocale, useTranslations } from "use-intl";

import { CREDIT_USAGE_CHART_COLOR } from "@/constants/billing-credits";
import {
  CREDIT_RANGES,
  type CreditUsageChartProps,
} from "@/types/billing/credits";
import { formatDollars, isCreditRange } from "@/utils/format";

export function CreditUsageChart({
  data,
  range,
  onRangeChange,
}: CreditUsageChartProps) {
  const t = useTranslations("billing.creditUsage");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const format = useFormatter();
  const chartConfig = {
    ai_credits: {
      label: t("creditsUsed"),
      color: CREDIT_USAGE_CHART_COLOR,
    },
  } satisfies ChartConfig;
  const formatShortDate = (timestamp: number) =>
    format.dateTime(new Date(timestamp), {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  const chartData =
    data?.map((row) => {
      const value = row.values?.[FEATURES.AI_CREDITS];
      return {
        date: row.period,
        ai_credits: typeof value === "number" ? value : 0,
      };
    }) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">{tCommon("labels.usage")}</h2>
        <Tabs
          onValueChange={(value) => {
            if (isCreditRange(value, CREDIT_RANGES)) {
              onRangeChange(value);
            }
          }}
          value={range}
        >
          <TabsList variant="line">
            {CREDIT_RANGES.map((value) => (
              <TabsTrigger key={value} value={value}>
                {value.toUpperCase()}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="rounded-xl border p-4">
        {chartData.length > 0 ? (
          <ChartContainer
            className="aspect-auto h-[240px] w-full"
            config={chartConfig}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
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
                tickFormatter={(value: number) => formatDollars(value, locale)}
                tickLine={false}
                tickMargin={8}
                width={48}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatDollars(Number(value), locale)}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.date ? formatShortDate(item.date) : "";
                    }}
                  />
                }
                cursor={false}
              />
              <Bar
                dataKey="ai_credits"
                fill="var(--color-ai_credits)"
                opacity={0.8}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="text-muted-foreground flex h-[240px] items-center justify-center text-sm">
            {t("empty")}
          </div>
        )}
      </div>
    </div>
  );
}
