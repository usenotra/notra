import type { GeoPromptResult } from "@notra/geo-core/types/geo";
import type { GeoSentimentResponse } from "@notra/geo-core/types/geo-sentiment";
import type {
  SentimentTheme,
  SentimentAnalysisState,
} from "@notra/geo-core/types/sentiment-analysis";

export interface SentimentScoreProps {
  summary: GeoSentimentResponse["summary"];
  comparison?: GeoSentimentResponse["comparison"];
}
export interface SentimentSkeletonProps {
  compact?: boolean;
}
export interface SentimentDetailRow {
  theme: string;
  id: string;
  title: string;
  polarity: SentimentTheme["polarity"];
  evidence: SentimentTheme["evidence"];
}

export interface SentimentTrendPlotProps {
  points: GeoSentimentResponse["points"];
}

export interface SentimentFamilyRow {
  family: string;
  iconEngine: string;
  label: string;
  score: number | null;
}

export interface SentimentTrendCardProps {
  summary?: GeoSentimentResponse["summary"];
  retry?: () => void;
  comparison?: GeoSentimentResponse["comparison"];
  points: GeoSentimentResponse["points"] | undefined;
  isPending: boolean;
  isError: boolean;
  isScanning: boolean;
}

export interface SentimentThemeTableProps {
  themes: SentimentTheme[];
  pending: boolean;
}

export interface SentimentThemesProps {
  organizationId: string;
  summary?: GeoSentimentResponse["summary"];
  aggregatePending?: boolean;
}
export interface SentimentThemesEmptyProps {
  title: string;
  message: string;
  canAnalyze: boolean;
  analyzing?: boolean;
  retrying: boolean;
  analyze: () => void;
  inline?: boolean;
}

export interface SentimentThemesStateInput {
  state?: SentimentAnalysisState;
  summary?: GeoSentimentResponse["summary"];
  isAnalyzing: boolean;
  isPending: boolean;
  isError: boolean;
  aggregatePending: boolean;
}

export interface SentimentSummaryProps {
  data?: GeoSentimentResponse;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

export interface BrandSentimentCardProps {
  organizationId: string;
  isScanning: boolean;
}

export interface AnswerSentimentProps {
  result: Pick<
    GeoPromptResult,
    "mentioned" | "sentiment" | "answer" | "excerpt"
  >;
}

export type SentimentThemesMessage =
  | { kind: "text"; text: string }
  | { kind: "key"; key: "noSupportedThemes" | "couldNotFind" | "notConfigured" }
  | { kind: "empty"; key: "noSavedAnswers" | "noRatedMentions" };

export type SentimentAnalysisStatusKey =
  | "finding"
  | "stalePrevious"
  | "failedPrevious"
  | "failedRetry"
  | "unavailable";

export type SentimentPolarity = "positive" | "neutral" | "negative";

export type SentimentScoreBand = "strong" | "positive" | "mixed" | "negative";

export interface SentimentBreakdownProps {
  organizationId: string;
  data: GeoSentimentResponse;
  isScanning: boolean;
}

export interface SentimentFamilyBucket {
  family: string;
  iconEngine: string;
  label: string;
  bucket: GeoSentimentResponse["summary"];
}

export interface SentimentDistributionBarProps {
  bucket: Pick<
    GeoSentimentResponse["summary"],
    "positiveShare" | "neutralShare" | "negativeShare"
  >;
  className?: string;
}

export interface SentimentBreakdownPlaceholderProps {
  state: "pending" | "error" | "empty";
  emptyKey: "noSavedAnswers" | "noRatedMentions";
  isScanning: boolean;
  retry: () => void;
}

export interface SentimentThemeChipsProps {
  organizationId: string;
  summary: GeoSentimentResponse["summary"];
}
