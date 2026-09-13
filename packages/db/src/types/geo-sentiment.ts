export interface GeoSentimentCounts {
  totalChecks: number;
  mentions: number;
  positive: number;
  neutral: number;
  negative: number;
  lastCheckedAt: string | null;
}

export interface GeoSentimentRow extends GeoSentimentCounts {
  engine: string;
  day: string;
}

export interface GeoSentimentCursor {
  capturedAt: string;
  id: string;
  projectId?: string | null;
}
