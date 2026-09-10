import type { useCustomer, useListPlans } from "autumn-js/react";
import type { ReactNode } from "react";

import type { ProductFeature } from "@/types/hooks/billing";

export type BillingPlan = Exclude<
  ReturnType<typeof useListPlans>["data"],
  undefined
>[number];

export interface BillingPlanGroup {
  id: string;
  name: string;
  description: string | null;
  monthly: BillingPlan | null;
  annual: BillingPlan | null;
}

export interface BillingPlanPrice {
  amount: number;
  interval: string;
}

export interface PlanCardButton {
  label: string;
  disabled: boolean;
  variant: "default" | "outline";
  onClick: () => void;
}

export interface PlanCardAddon {
  label: string;
  description: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export interface ZdrConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export type BillingCustomer = NonNullable<
  ReturnType<typeof useCustomer>["data"]
>;
export type BillingSubscription = BillingCustomer["subscriptions"][number];
export type BillingInvoice = NonNullable<BillingCustomer["invoices"]>[number];

export interface InvoicesTableProps {
  invoices: BillingInvoice[];
  plans: BillingPlan[] | undefined;
}

export type AttachPlanFn = ReturnType<typeof useCustomer>["attach"];
export type MultiAttachPlanFn = ReturnType<typeof useCustomer>["multiAttach"];

export interface AttachPlanParams {
  attach: AttachPlanFn;
  multiAttach: MultiAttachPlanFn;
  planId: string;
  includeZdr: boolean;
  successUrl?: string;
}

export interface AttachPlanResult {
  paymentUrl: string | null;
}

export interface PlanCardProps {
  name: string;
  description: string;
  price: number;
  intervalLabel: string;
  features: ProductFeature[];
  featured: boolean;
  highlighted: boolean;
  action?: ReactNode;
  addon?: PlanCardAddon;
  button: PlanCardButton;
}
