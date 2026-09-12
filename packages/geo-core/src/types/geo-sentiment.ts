import type { GeoSentimentCounts } from "@notra/db/types/geo-sentiment";
import type { z } from "zod";

import type { geoSentimentEvidenceInputSchema } from "../schemas/geo-sentiment";

export type GeoSentimentEvidenceInput = z.infer<
  typeof geoSentimentEvidenceInputSchema
>;

export interface GeoSentimentBucket extends GeoSentimentCounts {
  score: number | null;
  classifiedMentions: number;
  unknownMentions: number;
  notMentioned: number;
  positiveShare: number | null;
  neutralShare: number | null;
  negativeShare: number | null;
  classificationCoverage: number | null;
}

export interface GeoSentimentResponse {
  configured: true;
  summary: GeoSentimentBucket;
  engines: (GeoSentimentBucket & { engine: string })[];
  points: (GeoSentimentBucket & { day: string })[];
  comparison?: {
    current: { from: string; to: string };
    previous: { from: string; to: string };
    summary: GeoSentimentBucket;
    points: (GeoSentimentBucket & { day: string })[];
    delta: number | null;
  };
}

export interface GeoSentimentEvidenceItem {
  id: string;
  scanId: string;
  promptId: string;
  prompt: string;
  engine: string;
  language: string;
  capturedAt: string;
  answer: string;
  excerpt: string;
}

export interface GeoSentimentEvidenceResponse {
  items: GeoSentimentEvidenceItem[];
  nextCursor: NonNullable<GeoSentimentEvidenceInput["cursor"]> | null;
}
