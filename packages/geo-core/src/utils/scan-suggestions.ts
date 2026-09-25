import type { GeoScanSuggestionEvidence } from "@notra/db/types/geo-suggestions";

import { GEO_PROMPT_MAX_LENGTH, GEO_PROMPT_MIN_LENGTH } from "../constants/geo";
import {
  SCAN_SUGGESTION_EVIDENCE_LIMIT,
  SCAN_SUGGESTION_LIMIT,
} from "../constants/scan-suggestions";
import { promptMentionsBrand } from "../geo/suggestion-keywords";
import type {
  ScanSuggestionCandidate,
  ScanSuggestionCheck,
} from "../types/scan-suggestions";

export function scanQueryKey(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function mergeScanEvidence(
  evidence: readonly GeoScanSuggestionEvidence[]
): GeoScanSuggestionEvidence[] {
  const seen = new Set<string>();
  return [...evidence]
    .sort(
      (a, b) =>
        b.capturedAt.localeCompare(a.capturedAt) ||
        a.checkId.localeCompare(b.checkId)
    )
    .filter((item) => {
      const key = `${item.checkId}:${scanQueryKey(item.query)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, SCAN_SUGGESTION_EVIDENCE_LIMIT);
}

/** Exact normalized query deduplication, not semantic topic matching. */
export function collectScanSuggestions(
  checks: readonly ScanSuggestionCheck[],
  excludedPrompts: readonly string[],
  brandTerms: readonly string[]
): ScanSuggestionCandidate[] {
  const excluded = new Set(
    [...excludedPrompts, ...checks.map((check) => check.prompt)].map(
      scanQueryKey
    )
  );
  const candidates = new Map<string, ScanSuggestionCandidate>();
  const normalizedBrandTerms = brandTerms.map((term) => term.normalize("NFKC"));
  for (const check of checks) {
    if (!check.answer.trim()) {
      continue;
    }
    for (const query of check.grounding.queries) {
      const prompt = query.normalize("NFKC").trim().replace(/\s+/g, " ");
      const key = scanQueryKey(prompt);
      if (
        prompt.length < GEO_PROMPT_MIN_LENGTH ||
        prompt.length > GEO_PROMPT_MAX_LENGTH ||
        excluded.has(key) ||
        promptMentionsBrand(prompt, normalizedBrandTerms) ||
        /^(?:https?:\/\/|www\.|site:)/i.test(prompt) ||
        /^(?:log\s?in|sign\s?in|homepage|home page)$/i.test(prompt)
      ) {
        continue;
      }
      const candidate = candidates.get(key) ?? {
        prompt,
        evidence: [],
        origins: new Set<string>(),
        engines: new Set<string>(),
      };
      candidate.origins.add(scanQueryKey(check.prompt));
      candidate.engines.add(check.engine);
      candidate.evidence = mergeScanEvidence([
        ...candidate.evidence,
        {
          checkId: check.id,
          scanId: check.scanId,
          engine: check.engine,
          promptId: check.promptId,
          prompt: check.prompt,
          query,
          capturedAt: check.capturedAt.toISOString(),
          language: check.language,
        },
      ]);
      candidates.set(key, candidate);
    }
  }
  return [...candidates.values()]
    .sort(
      (a, b) =>
        b.origins.size - a.origins.size ||
        b.engines.size - a.engines.size ||
        (b.evidence[0]?.capturedAt ?? "").localeCompare(
          a.evidence[0]?.capturedAt ?? ""
        ) ||
        a.prompt.localeCompare(b.prompt)
    )
    .slice(0, SCAN_SUGGESTION_LIMIT);
}
