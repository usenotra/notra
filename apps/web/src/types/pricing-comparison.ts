type PricingComparisonValue = boolean | string;

type PricingComparisonPlanKey = "starter" | "growth" | "scale" | "enterprise";

export interface PricingComparisonPlan {
  key: PricingComparisonPlanKey;
  name: string;
  isFeatured: boolean;
}

export interface PricingCellValueProps {
  value: PricingComparisonValue;
}
