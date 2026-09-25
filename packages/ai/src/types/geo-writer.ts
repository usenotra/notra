import type { AILogTarget } from "@notra/ai/observability";
import type {
  geoBriefInternalLinkSchema,
  geoBriefSectionSchema,
  geoContentBriefSchema,
  geoContentSubtypeSchema,
} from "@notra/ai/schemas/geo-writer";
import type { ToneProfile } from "@notra/ai/schemas/tone";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { TccMetadata } from "@notra/ai/types/tcc";
import type { PostSourceMetadata } from "@notra/db/schema";
import type { GeoContentBriefBaselineJson } from "@notra/db/types/geo-writer";
import type { z } from "zod";

export type GeoContentSubtype = z.infer<typeof geoContentSubtypeSchema>;
export type GeoBriefSection = z.infer<typeof geoBriefSectionSchema>;
export type GeoBriefInternalLink = z.infer<typeof geoBriefInternalLinkSchema>;
export type GeoContentBrief = z.infer<typeof geoContentBriefSchema>;
export interface GeoWriterBrief extends GeoContentBrief {
  baseline?: GeoContentBriefBaselineJson | null;
}

export interface GeoPlannerBrand {
  companyName: string;
  aliases: string[];
  websiteUrl?: string | null;
  description?: string | null;
  audience?: string | null;
}

export interface GeoPlannerCompetitor {
  name: string;
  domain?: string | null;
}

export interface GeoPlannerGapPrompt {
  prompt: string;
  engines: string[];
}

export interface GeoPlannerSitemapPage {
  url: string;
  title?: string | null;
}

export interface GeoPlannerEvidenceEngine {
  engine: string;
  mentioned: boolean;
  position: number | null;
  sentiment: string | null;
  competitors: string[];
  excerpt: string;
  queries: string[];
  sourceDomains: string[];
}

export interface GeoPlannerEvidence {
  sourceKind?: "scan";
  prompt: string;
  mentionedEngines: number;
  totalEngines: number;
  engines: GeoPlannerEvidenceEngine[];
  competitorMentions: Array<{ name: string; engines: number }>;
  citedDomains: Array<{ domain: string; engines: number }>;
}

export interface GeoPlannerPromptInput {
  topic: string;
  brand: GeoPlannerBrand;
  competitors: GeoPlannerCompetitor[];
  gapPrompts: GeoPlannerGapPrompt[];
  sitemapPages: GeoPlannerSitemapPage[];
  contentSubtype?: GeoContentSubtype;
  evidence?: GeoPlannerEvidence | null;
  existingPageUrl?: string | null;
}

export interface GenerateGeoContentBriefOptions {
  organizationId: string;
  input: GeoPlannerPromptInput;
  log?: AILogTarget;
}

export interface GenerateGeoContentBriefResult {
  brief: GeoContentBrief;
  usage: AgentTokenUsage;
}

export interface GeoWriterPromptInput {
  brief: GeoWriterBrief;
  brandName: string;
  toneProfile?: ToneProfile | null;
  customTone?: string | null;
  topic: string;
  today: string;
  monthYear: string;
  language: string;
}

export interface RunGeoWriterOptions {
  organizationId: string;
  projectId: string;
  brandSettingsId: string;
  collectionId: string;
  brief: GeoWriterBrief;
  topic: string;
  brandName: string;
  toneProfile?: ToneProfile | null;
  customTone?: string | null;
  language?: string | null;
  sourceMetadata?: PostSourceMetadata;
  log?: AILogTarget;
  telemetryMetadata?: TccMetadata;
  postId?: string | null;
}

export interface GeoWriterResult {
  postId: string;
  title: string;
  humanized: boolean;
  usage: AgentTokenUsage;
}

export type SitemapToolsConfig =
  | { brandSettingsId: string; organizationId?: string }
  | { organizationId: string };

export interface GeoContextToolConfig {
  organizationId: string;
  projectId: string;
}
