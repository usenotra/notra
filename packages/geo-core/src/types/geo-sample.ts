import type { GeoCheckSource } from "@notra/db/types/geo-checks";

import type { GeoCompetitorSeed } from "./geo";

export interface GeoSamplePrompt {
  english: string;
  german: string;
}

export interface GeoSampleEngine {
  engine: string;
  mentionRate: number;
}

export interface GeoSampleSequence {
  name: string;
  steps: readonly string[];
}

/**
 * Everything brand-specific about generated GEO sample data. Local dev uses
 * the default profile; the public demo passes a fictional brand so no real
 * company is shown as a competitor.
 */
export interface GeoSampleCrawler {
  agent: string;
  category: string;
}

export interface GeoSampleReferral {
  source: string;
  referer: string;
}

export interface GeoSampleProfile {
  /**
   * Brand aliases for the seeded project. Defaults to the organization slug,
   * which in the demo is a random sandbox id nobody should see.
   */
  aliases?: readonly string[];
  projectName: string;
  days: number;
  competitors: readonly GeoCompetitorSeed[];
  prompts: readonly GeoSamplePrompt[];
  sequences: readonly GeoSampleSequence[];
  sources: readonly GeoCheckSource[];
  codingAgentSources: readonly GeoCheckSource[];
  trafficPaths: readonly string[];
  trafficHosts: readonly string[];
  /** AI crawlers and referral sources in the traffic; default: full catalog. */
  crawlers?: readonly GeoSampleCrawler[];
  referrals?: readonly GeoSampleReferral[];
  /** Engines to fabricate checks for; defaults to the full sample catalog. */
  engines?: readonly GeoSampleEngine[];
  /** Also fabricate German checks every other day (default true). */
  germanChecks?: boolean;
  /** Answer excerpts; `{brand}` and `{competitors}` are substituted. */
  excerpts: {
    mentioned: string;
    missing: string;
    mentionedGerman: string;
    missingGerman: string;
  };
}

export interface GeoSampleSeedInput {
  organizationId: string;
  projectId?: string;
  profile?: GeoSampleProfile;
  now?: Date;
}
