import type { fetchPublicUrl } from "@notra/ai/utils/public-fetch";

export type CrawlabilityFetch = typeof fetchPublicUrl;

export interface CrawlabilityDocument {
  url: string;
  status: number;
  headers: Headers;
  body: string;
}

export interface CrawlabilityRobots {
  url: string;
  status: number | null;
  body: string | null;
}

export interface CrawlabilityMetaTag {
  name: string;
  content: string;
}
