export interface ProductFeature {
  text: string;
  overageText?: string;
  overageTooltip?: string;
}

export interface FeatureData {
  id: string;
  name: string;
  balance: number | null;
  included: number | null;
  unlimited: boolean;
  nextResetAt: number | null;
}

export type UsageRangeOption = "7d" | "30d" | "90d";

export interface UsageLimitedFeatureRowProps {
  feature: FeatureData;
}

export interface UsageBreakdownPoint {
  date: number;
  ai_answers: number;
}

export interface UsageBreakdownChartProps {
  data: UsageBreakdownPoint[];
  loading: boolean;
  range: UsageRangeOption;
  onRangeChange: (range: UsageRangeOption) => void;
}

export interface UsageSectionBodyProps {
  aiAnswersFeature: FeatureData | undefined;
  aiAnswersRemaining: number;
  aiCreditsFeature: FeatureData | undefined;
  chartData: UsageBreakdownPoint[];
  chartLoading: boolean;
  hasAiAnswers: boolean;
  hasRetentionFeature: boolean;
  limitedFeatures: FeatureData[];
  onOpenTopup: () => void;
  onRangeChange: (range: UsageRangeOption) => void;
  range: UsageRangeOption;
  retentionDays: number;
  unlimitedFeatures: FeatureData[];
}
