import { createHash } from "node:crypto";

import type { GeoBrandFact } from "@notra/db/types/geo-accuracy";

import {
  ACCURACY_ANALYSIS_MODEL,
  ACCURACY_CATEGORY_LABELS,
  ACCURACY_CONFIDENCE_FLOOR,
} from "../constants/accuracy-analysis";
import { accuracyClaimOutputSchema } from "../schemas/accuracy-analysis";
import type {
  AccuracyAnalysisSample,
  AccuracyClaim,
  AccuracyClaimEvidence,
  AccuracyClaimProbabilities,
  AccuracyDailyPoint,
  AccuracyVerdict,
} from "../types/accuracy-analysis";

export function accuracyAnalysisKey(
  organizationId: string,
  projectId: string | null,
  from: string,
  to: string
) {
  return `geo:accuracy:analysis:${createHash("sha256")
    .update(
      JSON.stringify([
        ACCURACY_ANALYSIS_MODEL,
        organizationId,
        projectId,
        from,
        to,
      ])
    )
    .digest("hex")}`;
}

export function accuracyFactsFingerprint(facts: readonly GeoBrandFact[]) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        facts.map((fact) => [
          fact.id,
          fact.statement,
          fact.category,
          fact.sourceUrl ?? "",
        ])
      )
    )
    .digest("hex");
}

function compactAccuracyQuote(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeClaimStatement(value: string) {
  return compactAccuracyQuote(value).toLowerCase();
}

const EMPTY_PROBABILITIES: AccuracyClaimProbabilities = {
  accurate: 0,
  inaccurate: 0,
  unverifiable: 1,
};

export function validateAccuracyClaims(
  output: unknown,
  sample: AccuracyAnalysisSample[]
): Omit<AccuracyClaim, "verdict" | "probabilities">[] {
  const parsed = accuracyClaimOutputSchema.parse(output);
  const checks = new Map(sample.map((check) => [check.id, check]));
  const statements = new Set<string>();
  return parsed.claims.flatMap((claim) => {
    const normalized = normalizeClaimStatement(claim.statement);
    if (statements.has(normalized)) {
      return [];
    }
    statements.add(normalized);
    const seen = new Set<string>();
    const evidence = claim.evidence.flatMap((reference) => {
      const check = checks.get(reference.checkId);
      const quote = reference.quote.trim();
      const compactQuote = compactAccuracyQuote(quote);
      if (
        !(
          check &&
          compactQuote &&
          compactAccuracyQuote(check.answer).includes(compactQuote)
        )
      ) {
        return [];
      }
      const key = `${check.id}::${compactQuote}`;
      if (seen.has(key)) {
        return [];
      }
      seen.add(key);
      return [
        {
          checkId: reference.checkId,
          quote,
          prompt: check.prompt,
          engine: check.engine,
          capturedAt: check.capturedAt,
          sources: check.sources,
        } satisfies AccuracyClaimEvidence,
      ];
    });
    if (!evidence.length) {
      return [];
    }
    return [{ statement: claim.statement, category: claim.category, evidence }];
  });
}

export function verdictFromProbabilities(
  probabilities: AccuracyClaimProbabilities,
  floor = ACCURACY_CONFIDENCE_FLOOR
): AccuracyVerdict {
  const entries = [
    ["accurate", probabilities.accurate],
    ["inaccurate", probabilities.inaccurate],
    ["unverifiable", probabilities.unverifiable],
  ] as const;
  let best: AccuracyVerdict = "unverifiable";
  let bestProb = -1;
  for (const [verdict, probability] of entries) {
    if (probability > bestProb) {
      best = verdict;
      bestProb = probability;
    }
  }
  return bestProb < floor ? "unverifiable" : best;
}

export function scoredAccuracyCounts(claims: readonly AccuracyClaim[]) {
  let accurate = 0;
  let inaccurate = 0;
  let unverifiable = 0;
  for (const claim of claims) {
    if (claim.verdict === "accurate") {
      accurate += 1;
    } else if (claim.verdict === "inaccurate") {
      inaccurate += 1;
    } else {
      unverifiable += 1;
    }
  }
  const scored = accurate + inaccurate;
  return {
    accurate,
    inaccurate,
    unverifiable,
    score: scored > 0 ? accurate / scored : null,
  };
}

export function clusterAccuracyClaims(
  claims: readonly AccuracyClaim[]
): AccuracyClaim[] {
  const clusters = new Map<string, AccuracyClaim>();
  for (const claim of claims) {
    const key = normalizeClaimStatement(claim.statement);
    const existing = clusters.get(key);
    if (!existing) {
      clusters.set(key, {
        ...claim,
        evidence: [...claim.evidence],
        probabilities: { ...claim.probabilities },
      });
      continue;
    }
    existing.evidence.push(...claim.evidence);
    if (
      claim.verdict === "inaccurate" ||
      (existing.verdict !== "inaccurate" && claim.verdict === "accurate")
    ) {
      existing.verdict = claim.verdict;
      existing.probabilities = { ...claim.probabilities };
    }
  }
  return [...clusters.values()];
}

export function accuracyDailyPoints(
  claims: readonly AccuracyClaim[],
  from: string,
  length: number
): AccuracyDailyPoint[] {
  return Array.from({ length }, (_, index) => {
    const day = new Date(Date.parse(`${from}T00:00:00Z`) + index * 86400000)
      .toISOString()
      .slice(0, 10);
    const dayClaims = claims.filter((claim) =>
      claim.evidence.some((item) => item.capturedAt.slice(0, 10) === day)
    );
    return { day, ...scoredAccuracyCounts(dayClaims) };
  });
}

export function accuracyInsight(
  claims: readonly AccuracyClaim[],
  companyName: string
): string {
  const inaccurate = claims.filter((claim) => claim.verdict === "inaccurate");
  if (!inaccurate.length) {
    return `AI engines mostly get ${companyName} right.`;
  }
  const counts = new Map<AccuracyClaim["category"], number>();
  for (const claim of inaccurate) {
    counts.set(claim.category, (counts.get(claim.category) ?? 0) + 1);
  }
  let top: AccuracyClaim["category"] = "other";
  let topCount = 0;
  for (const [category, count] of counts) {
    if (count > topCount) {
      top = category;
      topCount = count;
    }
  }
  return `${ACCURACY_CATEGORY_LABELS[top]} claims drive most errors`;
}

export function attachVerdicts(
  extracted: readonly Omit<AccuracyClaim, "verdict" | "probabilities">[],
  ranked: ReadonlyMap<number, AccuracyClaimProbabilities>
): AccuracyClaim[] {
  return extracted.map((claim, index) => {
    const probabilities = ranked.get(index) ?? EMPTY_PROBABILITIES;
    return {
      ...claim,
      probabilities,
      verdict: verdictFromProbabilities(probabilities),
    };
  });
}

export function topInaccurateClaims(
  claims: readonly AccuracyClaim[],
  limit: number
): AccuracyClaim[] {
  return claims
    .filter((claim) => claim.verdict === "inaccurate")
    .sort((left, right) => {
      const evidenceDelta = right.evidence.length - left.evidence.length;
      if (evidenceDelta !== 0) {
        return evidenceDelta;
      }
      return right.probabilities.inaccurate - left.probabilities.inaccurate;
    })
    .slice(0, limit);
}

function knowledgeTokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/,/g, "")
      .match(/[a-z0-9]+(?:\.[0-9]+)?/g) ?? []
  );
}

function knowledgeTokenOverlap(left: Set<string>, right: Set<string>): number {
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) {
      overlap += 1;
    }
  }
  return overlap;
}

export function relatedKnowledgeFacts(
  statement: string,
  category: GeoBrandFact["category"],
  facts: readonly GeoBrandFact[],
  limit = 3
): GeoBrandFact[] {
  const claimTokens = knowledgeTokens(statement);
  const scored = facts.map((fact, index) => ({
    fact,
    index,
    overlap: knowledgeTokenOverlap(
      claimTokens,
      knowledgeTokens(fact.statement)
    ),
    sameCategory: fact.category === category,
  }));
  const overlapping = scored
    .filter((entry) => entry.overlap > 0)
    .sort(
      (left, right) =>
        right.overlap - left.overlap ||
        Number(right.sameCategory) - Number(left.sameCategory) ||
        left.index - right.index
    );
  const fallback = scored.filter((entry) => entry.sameCategory);
  return (overlapping.length ? overlapping : fallback)
    .slice(0, limit)
    .map((entry) => entry.fact);
}
