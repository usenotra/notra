import type { BrandInfo } from "@/types/brand-analysis";
import type { ProgressData } from "@/types/hooks/brand-analysis";

export interface BrandAnalysisProgressInput {
  organizationId: string;
  websiteUrl?: string;
  jobId?: string;
  progress: ProgressData;
  startedAt?: number;
}

export interface ExtractBrandInfoInput {
  content: string;
  organizationId: string;
  jobId?: string;
  voiceId?: string;
}

export interface SaveBrandSettingsInput {
  organizationId: string;
  voiceId?: string;
  url: string;
  brandInfo: BrandInfo;
}

export type BrandAnalysisWorkflowResult =
  | { status: "completed"; brandInfo: BrandInfo }
  | { status: "invalid_payload" }
  | { status: "scraping_failed" }
  | { status: "extraction_failed" };
