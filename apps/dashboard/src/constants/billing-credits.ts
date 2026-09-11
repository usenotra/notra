import type { ChartConfig } from "@notra/ui/components/ui/chart";

export const CREDIT_EVENTS_PAGE_SIZE = 20;

export const CREDIT_USAGE_CHART_CONFIG = {
  ai_credits: {
    label: "Credits Used",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;
