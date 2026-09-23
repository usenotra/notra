export const GEO_BRAND_FACT_CATEGORIES = [
  "pricing",
  "features",
  "policy",
  "company",
  "other",
] as const;

export type GeoBrandFactCategory = (typeof GEO_BRAND_FACT_CATEGORIES)[number];

export interface GeoBrandFact {
  id: string;
  statement: string;
  category: GeoBrandFactCategory;
  sourceUrl?: string;
}

export const BRAND_KNOWLEDGE_ORIGINS = ["github", "website", "manual"] as const;

export type BrandKnowledgeOrigin = (typeof BRAND_KNOWLEDGE_ORIGINS)[number];

export interface BrandKnowledgeRecord extends GeoBrandFact {
  origin: BrandKnowledgeOrigin;
  sourcePath?: string;
  pinned?: boolean;
}

export interface GeoAccuracySampleRow {
  id: string;
  answer: string;
  prompt: string;
  engine: string;
  capturedAt: string;
  sources: { url: string; title: string | null }[];
}

export interface GeoAccuracyFactsRow {
  companyName: string;
  aliases: string[];
  brandFacts: GeoBrandFact[];
  companyDescription: string | null;
}

export interface GeoAccuracySnapshotRow {
  fingerprint: string;
  eligible: number;
}
