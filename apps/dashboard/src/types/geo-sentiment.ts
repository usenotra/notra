import type { GeoPromptResult } from "@notra/geo-core/types/geo";
import type { GeoSentimentResponse } from "@notra/geo-core/types/geo-sentiment";

export interface SentimentFamilyRow {
  family: string;
  iconEngine: string;
  label: string;
  score: number | null;
}

export interface SentimentFamilyListProps {
  engines: GeoSentimentResponse["engines"];
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
