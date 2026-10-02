import type { PricingComparisonPlan } from "@/types/pricing-comparison";
import { PRICING_PLANS } from "@/utils/constants";

export const PRICING_COMPARISON_PLANS: PricingComparisonPlan[] = [
  { key: "starter", name: PRICING_PLANS.starter.name, isFeatured: false },
  { key: "growth", name: PRICING_PLANS.growth.name, isFeatured: true },
  { key: "scale", name: PRICING_PLANS.scale.name, isFeatured: false },
  { key: "enterprise", name: PRICING_PLANS.enterprise.name, isFeatured: false },
];
