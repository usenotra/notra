import type {
  GscQueryRow,
  GscSite,
} from "@notra/ai/types/google-search-console";
import type { geoPromptSuggestions } from "@notra/db/schema";

export interface GscOAuthState {
  organizationId: string;
  userId: string;
  callbackPath: string;
}

export type GscIntegrationStatus = "active" | "reauth_required";

export interface GeoSearchConsoleStatus {
  configured: boolean;
  connected: boolean;
  email: string | null;
  siteUrl: string | null;
  status: GscIntegrationStatus | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  weeklySyncScheduled: boolean;
  sites: GscSite[];
}

export interface GscSitesResponse {
  sites: GscSite[];
}

export interface GscKeywordsResponse {
  keywords: GscQueryRow[];
}

export interface GscSelectSiteInput {
  siteUrl: string;
  projectId?: string;
}

export interface GscSyncResult {
  status: "completed" | "skipped" | "invalid_payload";
  keywords?: number;
  suggestionsAdded?: number;
  reason?: string;
}

export interface GscSuggestionSyncOutcome {
  suggestions: (typeof geoPromptSuggestions.$inferInsert)[];
  /** Opportunity-ranked queries stored for suggestions and editor highlighting. */
  topQueries: GscQueryRow[];
  /** Rows Search Console returned, before ranking. Drives the sync toast. */
  fetchedQueries: number;
}

export interface GscSyncPayload {
  organizationId: string;
}

export interface GscSuggestionGenerationParams {
  companyName: string | null;
  companyDescription: string | null;
  competitors: string[];
  siteUrl: string;
  keywords: GscQueryRow[];
  existingPrompts: string[];
}
