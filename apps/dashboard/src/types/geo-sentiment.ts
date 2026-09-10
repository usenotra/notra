import type { GeoPromptResult } from "@notra/geo-core/types/geo";
import type { GeoSentimentResponse } from "@notra/geo-core/types/geo-sentiment";
import type {
  SentimentAnalysisState,
  SentimentAnalysisResult,
  SentimentTheme,
} from "@notra/geo-core/types/sentiment-analysis";

export interface SentimentScoreProps {
  summary: GeoSentimentResponse["summary"];
  comparison?: GeoSentimentResponse["comparison"];
}
export interface SentimentSkeletonProps {
  compact?: boolean;
}
export interface SentimentThemeRowProps {
  theme: SentimentTheme;
}
export interface SentimentTrendPlotProps {
  points: GeoSentimentResponse["points"];
  comparison?: GeoSentimentResponse["comparison"];
  showCurrent: boolean;
  showPrevious: boolean;
}
export interface SentimentAnalysisActionInput {
  status?: SentimentAnalysisState["status"];
  busy: boolean;
  loading: boolean;
  failed: boolean;
}
export interface SentimentAnalysisNoticeProps {
  busy: boolean;
  state?: SentimentAnalysisState;
  loading: boolean;
  failedLookup: boolean;
  failedMutation: boolean;
  retry: () => void;
}
export interface SentimentThemeGroupProps {
  polarity: SentimentTheme["polarity"];
  themes: SentimentTheme[];
}
export interface SentimentThemeResultsProps {
  result: SentimentAnalysisResult;
}
export type SentimentThemeGroups = Record<
  SentimentTheme["polarity"],
  SentimentTheme[]
>;

export interface SentimentFamilyRow {
  family: string;
  iconEngine: string;
  label: string;
  score: number | null;
}

export interface SentimentFamilyListProps {
  engines: GeoSentimentResponse["engines"];
}

export interface SentimentTrendCardProps {
  comparison?: GeoSentimentResponse["comparison"];
  points: GeoSentimentResponse["points"] | undefined;
  isPending: boolean;
  isError: boolean;
  isScanning: boolean;
}

export interface SentimentThemesProps {
  organizationId: string;
  summary?: GeoSentimentResponse["summary"];
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
