import { redis } from "@notra/ai/utils/redis";

import {
  ACCURACY_ANALYSIS_CACHE_SECONDS,
  ACCURACY_ANALYSIS_COMMIT_SCRIPT,
  ACCURACY_ANALYSIS_LOCK_SECONDS,
  ACCURACY_ANALYSIS_RENEW_SCRIPT,
} from "../constants/accuracy-analysis";
import type {
  AccuracyAnalysisRun,
  AccuracyAnalysisSnapshot,
  AccuracyAnalysisState,
  AccuracyAnalysisStore,
} from "../types/accuracy-analysis";
import {
  accuracyDailyPoints,
  accuracyInsight,
  clusterAccuracyClaims,
  scoredAccuracyCounts,
} from "../utils/accuracy-analysis";
import { logGeoSkip } from "../utils/geo-log";

export function accuracyAnalysisStore(): AccuracyAnalysisStore | null {
  const client = redis;
  if (!client) {
    return null;
  }
  return {
    get: (key) => client.get<AccuracyAnalysisState>(key),
    locked: async (key) => Boolean(await client.get(key)),
    renew: async (key, token) =>
      (await client.eval(
        ACCURACY_ANALYSIS_RENEW_SCRIPT,
        [key],
        [token, ACCURACY_ANALYSIS_LOCK_SECONDS]
      )) === 1,
    claim: async (key, token) =>
      (await client.set(key, token, {
        nx: true,
        ex: ACCURACY_ANALYSIS_LOCK_SECONDS,
      })) === "OK",
    commit: async (key, resultKey, token, state, latestKey) =>
      (await client.eval(
        ACCURACY_ANALYSIS_COMMIT_SCRIPT,
        [key, resultKey, latestKey],
        [token, JSON.stringify(state), ACCURACY_ANALYSIS_CACHE_SECONDS]
      )) === 1,
  };
}

function emptyState(
  status: AccuracyAnalysisState["status"],
  run: Pick<AccuracyAnalysisRun, "companyName" | "facts" | "suggestedFact">,
  message: string | null,
  result: AccuracyAnalysisState["result"] = null
): AccuracyAnalysisState {
  return {
    status,
    result,
    facts: run.facts,
    suggestedFact: run.suggestedFact,
    companyName: run.companyName,
    message,
  };
}

function accuracyFailureMessage(error: unknown) {
  if (error instanceof Error && error.message === "AI credits unavailable") {
    return "Analysis could not complete. Check AI credits and provider availability, then retry.";
  }
  if (
    error instanceof Error &&
    error.message === "Evaluation model unavailable"
  ) {
    return "Fact checks require the evaluation model.";
  }
  return "Analysis could not complete. Please retry.";
}

export async function readAccuracyAnalysis(
  run: Pick<
    AccuracyAnalysisRun,
    "key" | "store" | "snapshot" | "companyName" | "facts" | "suggestedFact"
  >
): Promise<AccuracyAnalysisState> {
  const snapshot = await run.snapshot();
  const key = `${run.key}:${snapshot.fingerprint}`;
  const state = await run.store.get(key);
  const previous = state?.result
    ? state
    : await run.store.get(`${run.key}:latest`);
  if (await run.store.locked(`${run.key}:lock`)) {
    return emptyState("pending", run, null, previous?.result ?? null);
  }
  if (state) {
    return {
      ...state,
      facts: run.facts,
      suggestedFact: run.suggestedFact,
      companyName: run.companyName,
      result: state.result ?? previous?.result ?? null,
    };
  }
  return emptyState(
    "stale",
    run,
    "Analysis missing or out of date. Select Analyze answers to refresh.",
    previous?.result ?? null
  );
}

async function completeAccuracyAnalysis(
  run: AccuracyAnalysisRun,
  snapshot: AccuracyAnalysisSnapshot,
  key: string,
  lock: string,
  token: string,
  period: { from: string; length: number }
): Promise<AccuracyAnalysisState> {
  let state: AccuracyAnalysisState;
  try {
    const settled = await run.store.get(key);
    if (settled?.status === "ready") {
      state = {
        ...settled,
        facts: run.facts,
        suggestedFact: run.suggestedFact,
        companyName: run.companyName,
      };
    } else {
      const sample = await run.sample();
      const current = await run.snapshot();
      if (current.fingerprint !== snapshot.fingerprint) {
        state = emptyState(
          "stale",
          run,
          "Saved answers changed. Refresh the analysis."
        );
      } else {
        const claims = sample.length
          ? await run.extract(sample, () => run.store.renew(lock, token))
          : [];
        const clustered = clusterAccuracyClaims(claims);
        const counts = scoredAccuracyCounts(clustered);
        const fresh =
          (await run.snapshot()).fingerprint === snapshot.fingerprint;
        state = fresh
          ? emptyState("ready", run, null, {
              fingerprint: snapshot.fingerprint,
              generatedAt: new Date().toISOString(),
              sampled: sample.length,
              eligible: snapshot.eligible,
              companyName: run.companyName,
              facts: run.facts,
              ...counts,
              insight: accuracyInsight(clustered, run.companyName),
              points: accuracyDailyPoints(
                clustered,
                period.from,
                period.length
              ),
              claims: clustered,
            })
          : emptyState(
              "stale",
              run,
              "Saved answers changed. Refresh the analysis."
            );
      }
    }
  } catch (error) {
    logGeoSkip(
      "Accuracy analysis failed",
      { event: "geo.accuracy_analysis.failed" },
      error
    );
    state = emptyState("failed", run, accuracyFailureMessage(error));
  }
  if (!(await run.store.commit(lock, key, token, state, `${run.key}:latest`))) {
    return emptyState("stale", run, "Analysis expired. Refresh to try again.");
  }
  return state;
}

export async function runAccuracyAnalysis(
  run: AccuracyAnalysisRun,
  period: { from: string; length: number }
): Promise<AccuracyAnalysisState> {
  const snapshot = await run.snapshot();
  const key = `${run.key}:${snapshot.fingerprint}`;
  const cached = await run.store.get(key);
  if (cached?.status === "ready") {
    return {
      ...cached,
      facts: run.facts,
      suggestedFact: run.suggestedFact,
      companyName: run.companyName,
    };
  }
  const token = crypto.randomUUID();
  const lock = `${run.key}:lock`;
  if (!(await run.store.claim(lock, token))) {
    return emptyState("pending", run, null);
  }
  const complete = () =>
    completeAccuracyAnalysis(run, snapshot, key, lock, token, period);
  if (run.defer) {
    run.defer(async () => {
      await complete();
    });
    return emptyState("pending", run, null);
  }
  return complete();
}
