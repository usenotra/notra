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
  theme?: string;
  id: string;
  title: string;
  polarity: SentimentTheme["polarity"];
  evidence: SentimentTheme["evidence"];
}

export type SentimentTableView = "themes" | "answers";
export interface SentimentTrendPlotProps {
  points: GeoSentimentResponse["points"];
  comparison?: GeoSentimentResponse["comparison"];
  showCurrent: boolean;
  showPrevious: boolean;
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

export interface SentimentTrendContentProps extends SentimentTrendCardProps {
  showCurrent: boolean;
  showPrevious: boolean;
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
  retrying: boolean;
  analyze: () => void;
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
