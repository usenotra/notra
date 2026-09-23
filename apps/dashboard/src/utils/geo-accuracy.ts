import type { GeoBrandFact } from "@notra/db/types/geo-accuracy";
import type { AccuracyClaim } from "@notra/geo-core/types/accuracy-analysis";
import { relatedKnowledgeFacts } from "@notra/geo-core/utils/accuracy-analysis";

import { ACCURACY_VERDICT_ORDER } from "@/constants/geo-accuracy";
import type {
  AccuracyClaimRow,
  AccuracyClaimsViewInput,
} from "@/types/geo-accuracy";

export function accuracyAnalysisInterval(
  state?: AccuracyClaimsViewInput["state"]
) {
  switch (state?.status) {
    case "pending":
      return 3000;
    case "stale":
      return 30_000;
    default:
      return false;
  }
}

export function accuracyAnalysisStatus(
  state?: AccuracyClaimsViewInput["state"]
) {
  switch (state?.status) {
    case "pending":
      return "Checking claims against Knowledge…";
    case "stale":
      return state.result
        ? "Showing previous results. Analysis needs an update."
        : "";
    case "failed":
      return state.result
        ? "Analysis failed. Showing previous results."
        : "Analysis failed. Try again.";
    case "unavailable":
      return state.message ?? "Accuracy analysis is unavailable.";
    default:
      return "";
  }
}

export function publicHttpUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function accuracyClaimRows(
  claims: readonly AccuracyClaim[],
  facts: readonly GeoBrandFact[]
): AccuracyClaimRow[] {
  return claims
    .map((claim, index) => ({
      ...claim,
      id: JSON.stringify([
        claim.verdict,
        claim.category,
        index,
        claim.statement,
      ]),
      relatedFacts: relatedKnowledgeFacts(
        claim.statement,
        claim.category,
        facts
      ),
    }))
    .sort(
      (left, right) =>
        ACCURACY_VERDICT_ORDER[left.verdict] -
          ACCURACY_VERDICT_ORDER[right.verdict] ||
        right.evidence.length - left.evidence.length
    );
}

export function accuracyClaimsView({
  state,
  isAnalyzing,
  isPending,
  isError,
}: AccuracyClaimsViewInput) {
  const facts = state?.facts ?? [];
  const claims = state?.result?.claims ?? [];
  const busy = !isError && (isAnalyzing || state?.status === "pending");
  const loading = !isError && isPending;
  const needsFacts =
    Boolean(state) && facts.length === 0 && !isError && !loading;
  const showResults = !isError && !needsFacts && claims.length > 0;
  const canAnalyze =
    !busy &&
    !loading &&
    !needsFacts &&
    state?.status !== "unavailable" &&
    (state?.status === "stale" || state?.status === "failed" || !showResults);
  let message =
    "Analyze saved answers against Knowledge. Each claim is labeled accurate, inaccurate, or unverifiable.";
  if (state?.status === "unavailable") {
    message = state.message ?? "Accuracy analysis is unavailable.";
  } else if (state?.status === "failed") {
    message = state.message ?? "Could not check claims. Try again.";
  }
  return {
    facts,
    claims,
    needsFacts,
    pending: (busy || loading) && !showResults,
    showTable: !needsFacts && (busy || loading || showResults),
    showEmpty:
      !loading &&
      !busy &&
      !isError &&
      !needsFacts &&
      (!showResults || canAnalyze),
    canAnalyze,
    retrying: state?.status === "failed",
    title: showResults ? "Update fact check" : "No fact check yet",
    message,
  };
}
