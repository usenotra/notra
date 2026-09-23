import { gateway } from "@notra/ai/gateway";
import type { BrandKnowledgeRecord } from "@notra/db/types/geo-accuracy";
import {
  listBrandKnowledgeGithubRepos,
  queryBrandKnowledge,
  updateBrandKnowledge,
} from "@notra/db/utils/brand-knowledge-store";
import { Effect } from "effect";
import type { z } from "zod";

import {
  KNOWLEDGE_CORPUS_CHARS,
  KNOWLEDGE_SCAN_MODEL,
} from "../constants/brand-knowledge";
import { GeoContentBillingService } from "../deps";
import type { brandKnowledgeScanInputSchema } from "../schemas/brand-knowledge";
import type { KnowledgeScanSource } from "../types/brand-knowledge";
import {
  mergeKnowledgeRecords,
  parseKnowledgeScanOutput,
} from "../utils/brand-knowledge";
import { billAccuracyAnalysis } from "./accuracy-analysis-billing";
import { generateKnowledgeScan } from "./brand-knowledge-agent";
import { collectGithubKnowledgeSources } from "./brand-knowledge-github";
import { collectWebsiteKnowledgeSources } from "./brand-knowledge-web";
import { geoDb } from "./effect";

function trimCorpus(sources: KnowledgeScanSource[]): KnowledgeScanSource[] {
  let remaining = KNOWLEDGE_CORPUS_CHARS;
  const trimmed: KnowledgeScanSource[] = [];
  for (const source of sources) {
    if (remaining <= 0) {
      break;
    }
    const markdown = source.markdown.slice(0, remaining);
    remaining -= markdown.length;
    trimmed.push({ ...source, markdown });
  }
  return trimmed;
}

async function gatherKnowledgeSources(
  organizationId: string,
  voiceId: string,
  githubId: string | null,
  websiteUrl: string
): Promise<{ sources: KnowledgeScanSource[]; syncError: string | null }> {
  const sources: KnowledgeScanSource[] = [];
  let syncError: string | null = null;
  if (githubId) {
    try {
      sources.push(
        ...(await collectGithubKnowledgeSources(organizationId, githubId))
      );
    } catch (error) {
      syncError = error instanceof Error ? error.message : "GitHub scan failed";
    }
  }
  if (websiteUrl) {
    try {
      sources.push(
        ...(await collectWebsiteKnowledgeSources(websiteUrl, voiceId))
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Website scan failed";
      syncError = syncError ? `${syncError}; ${message}` : message;
    }
  }
  return { sources: trimCorpus(sources), syncError };
}

export const loadBrandKnowledge = Effect.fn("brand.knowledge")(function* (
  organizationId: string,
  voiceId: string
) {
  const row = yield* geoDb("brand knowledge lookup failed", () =>
    queryBrandKnowledge(organizationId, voiceId)
  );
  if (!row) {
    throw new Error("Brand identity not found");
  }
  const githubRepos = yield* geoDb("github repos lookup failed", () =>
    listBrandKnowledgeGithubRepos(organizationId)
  );
  return {
    websiteUrl: row.websiteUrl,
    githubIntegrationId: row.githubIntegrationId,
    githubRepos,
    records: row.records,
    syncedAt: row.syncedAt,
    syncError: row.syncError,
    companyName: row.companyName,
  };
});

export const saveBrandKnowledge = Effect.fn("brand.knowledgeSave")(function* (
  organizationId: string,
  voiceId: string,
  records: BrandKnowledgeRecord[],
  githubIntegrationId?: string | null
) {
  const saved = yield* geoDb("brand knowledge save failed", () =>
    updateBrandKnowledge(organizationId, voiceId, {
      records,
      ...(githubIntegrationId !== undefined ? { githubIntegrationId } : {}),
    })
  );
  if (!saved) {
    throw new Error("Brand identity not found");
  }
  return yield* loadBrandKnowledge(organizationId, voiceId);
});

export const scanBrandKnowledge = Effect.fn("brand.knowledgeScan")(function* (
  input: z.infer<typeof brandKnowledgeScanInputSchema>
) {
  const billing = yield* GeoContentBillingService;
  if (input.githubIntegrationId !== undefined) {
    const linked = yield* geoDb("brand knowledge github link failed", () =>
      updateBrandKnowledge(input.organizationId, input.voiceId, {
        githubIntegrationId: input.githubIntegrationId,
      })
    );
    if (!linked) {
      throw new Error("Brand identity not found");
    }
  }
  const current = yield* loadBrandKnowledge(
    input.organizationId,
    input.voiceId
  );
  const githubId = current.githubIntegrationId;
  const websiteUrl = current.websiteUrl.trim();
  if (!(githubId || websiteUrl)) {
    throw new Error("Add a website or GitHub repo before scanning.");
  }

  const gathered = yield* geoDb("knowledge sources collect failed", () =>
    gatherKnowledgeSources(
      input.organizationId,
      input.voiceId,
      githubId,
      websiteUrl
    )
  );
  const corpus = gathered.sources;
  const syncError = gathered.syncError;
  if (corpus.length === 0) {
    yield* geoDb("brand knowledge error save failed", () =>
      updateBrandKnowledge(input.organizationId, input.voiceId, {
        syncError: syncError ?? "Nothing to scan",
      })
    );
    throw new Error(syncError ?? "Nothing to scan");
  }

  const extracted = yield* geoDb("knowledge scan extract failed", async () => {
    const output = await billAccuracyAnalysis({
      organizationId: input.organizationId,
      billing,
      owns: async () => true,
      modelId: KNOWLEDGE_SCAN_MODEL,
      source: "brand_knowledge_scan",
      logPrefix: "BrandKnowledgeScan",
      generate: () =>
        generateKnowledgeScan(
          gateway(KNOWLEDGE_SCAN_MODEL, {
            organizationId: input.organizationId,
            gateway: "vercel",
          }),
          current.companyName,
          corpus
        ),
    });
    return parseKnowledgeScanOutput(output, corpus);
  });

  const merged = mergeKnowledgeRecords(current.records, extracted);
  const saved = yield* geoDb("brand knowledge scan save failed", () =>
    updateBrandKnowledge(input.organizationId, input.voiceId, {
      records: merged,
      syncedAt: new Date(),
      syncError,
    })
  );
  if (!saved) {
    throw new Error("Brand identity not found");
  }
  return yield* loadBrandKnowledge(input.organizationId, input.voiceId);
});
