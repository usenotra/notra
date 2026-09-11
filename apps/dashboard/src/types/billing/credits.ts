import type { IAutumnClient, useAggregateEvents } from "autumn-js/react";
import type { ReactNode } from "react";

import type { BillingCustomer } from "@/types/billing/plan";

export const CREDIT_RANGES = ["7d", "30d", "90d"] as const;
export type CreditRangeOption = (typeof CREDIT_RANGES)[number];

export const CREDIT_RANGE_LABELS: Record<CreditRangeOption, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

export interface CreditBalanceMenuItemProps {
  className?: string;
  onOpenTopup: () => void;
}

export type ListEventsRow = NonNullable<
  Awaited<ReturnType<IAutumnClient["listEvents"]>>["list"]
>[number];

export interface CreditSummaryCardsProps {
  customer: BillingCustomer | undefined;
  isLoading: boolean;
  totalUsage: number;
  range: CreditRangeOption;
  balanceAction?: ReactNode;
}

export interface CreditUsageChartProps {
  data: ReturnType<typeof useAggregateEvents>["list"];
  range: CreditRangeOption;
  onRangeChange: (range: CreditRangeOption) => void;
}
