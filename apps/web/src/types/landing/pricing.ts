import type { ComponentType, SVGProps } from "react";

export type PricingIconKey =
  | "tracking"
  | "images"
  | "content"
  | "social"
  | "projects"
  | "references"
  | "retention"
  | "support"
  | "zdr";

export type PricingIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type BillingPeriod = "monthly" | "yearly";

export interface BillingToggleOption {
  value: BillingPeriod;
  label: string;
}

interface PricingFeature {
  label: string;
  subtitle?: string;
  icon: PricingIconKey;
}

type PricingCtaKind = "signup" | "mail";

interface PricingCta {
  label: string;
  kind: PricingCtaKind;
  href: string;
  source: string;
  showArrow: boolean;
}

export interface PricingPlan {
  id: string;
  /** Monthly `ai_answers` quota; `null` means unlimited (Enterprise). */
  answersPerMonth: number | null;
  name: string;
  description: string;
  price: Record<BillingPeriod, string>;
  priceSuffix?: Record<BillingPeriod, string>;
  variant: "default" | "featured";
  hasAnnualBadge?: boolean;
  cta: PricingCta;
  features: PricingFeature[];
}

export interface TrackedEngine {
  name: string;
  src: string;
  darkSrc?: string;
  width: number;
}

export interface PricingCardProps {
  plan: PricingPlan;
  billingPeriod: BillingPeriod;
}

export interface PricingBillingToggleProps {
  value: BillingPeriod;
  onValueChange: (value: BillingPeriod) => void;
}

export interface LandingPricingSectionProps {
  showHeader?: boolean;
}
