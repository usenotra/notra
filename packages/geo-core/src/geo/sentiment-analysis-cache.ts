import { redis } from "@notra/ai/utils/redis";

import {
  SENTIMENT_ANALYSIS_CACHE_SECONDS,
  SENTIMENT_ANALYSIS_COMMIT_SCRIPT,
  SENTIMENT_ANALYSIS_LOCK_SECONDS,
  SENTIMENT_ANALYSIS_RENEW_SCRIPT,
} from "../constants/sentiment-analysis";
import type {
  SentimentAnalysisRun,
  SentimentAnalysisState,
  SentimentAnalysisStore,
} from "../types/sentiment-analysis";
import { validateSentimentThemes } from "../utils/sentiment-analysis";

export function sentimentAnalysisStore(): SentimentAnalysisStore | null {
  const client = redis;
  if (!client) {
    return null;
  }
  return {
    get: (key) => client.get<SentimentAnalysisState>(key),
    locked: async (key) => Boolean(await client.get(key)),
    renew: async (key, token) =>
      (await client.eval(
        SENTIMENT_ANALYSIS_RENEW_SCRIPT,
        [key],
        [token, SENTIMENT_ANALYSIS_LOCK_SECONDS]
      )) === 1,
    claim: async (key, token) =>
      (await client.set(key, token, {
        nx: true,
        ex: SENTIMENT_ANALYSIS_LOCK_SECONDS,
      })) === "OK",
    commit: async (key, resultKey, token, state, latestKey) =>
      (await client.eval(
        SENTIMENT_ANALYSIS_COMMIT_SCRIPT,
        [key, resultKey, latestKey],
        [token, JSON.stringify(state), SENTIMENT_ANALYSIS_CACHE_SECONDS]
      )) === 1,
  };
}

export async function readSentimentAnalysis(
  run: Pick<SentimentAnalysisRun, "key" | "store" | "snapshot">
): Promise<SentimentAnalysisState> {
  const snapshot = await run.snapshot();
  const key = `${run.key}:${snapshot.fingerprint}`;
  const state = await run.store.get(key);
  const previous = state?.result
    ? state
    : await run.store.get(`${run.key}:latest`);
  if (await run.store.locked(`${run.key}:lock`)) {
    return {
      status: "pending",
      result: previous?.result ?? null,
      message: null,
    };
  }
  return state
    ? { ...state, result: state.result ?? previous?.result ?? null }
    : {
        status: "stale",
        result: previous?.result ?? null,
        message:
          "Analysis missing or out of date. Select Analyze answers to refresh.",
      };
}

export async function runSentimentAnalysis(
  run: SentimentAnalysisRun
): Promise<SentimentAnalysisState> {
  const snapshot = await run.snapshot();
  const key = `${run.key}:${snapshot.fingerprint}`;
  const cached = await run.store.get(key);
  if (cached?.status === "ready") {
    return cached;
  }
  const token = crypto.randomUUID();
  const lock = `${run.key}:lock`;
  if (!(await run.store.claim(lock, token))) {
    return { status: "pending", result: null, message: null };
  }
  let state: SentimentAnalysisState;
  try {
    // Another request can finish between our first read and acquiring the lease.
    const settled = await run.store.get(key);
    if (settled?.status === "ready") {
      await run.store.commit(lock, key, token, settled, `${run.key}:latest`);
      return settled;
    }
    const sample = await run.sample();
    if ((await run.snapshot()).fingerprint !== snapshot.fingerprint) {
      throw new Error("Historical inputs changed");
    }
    const themes = sample.length
      ? validateSentimentThemes(
          await run.extract(sample, () => run.store.renew(lock, token)),
          sample
        )
      : [];
    const fresh = (await run.snapshot()).fingerprint === snapshot.fingerprint;
    state = fresh
      ? {
          status: "ready",
          message: null,
          result: {
            fingerprint: snapshot.fingerprint,
            generatedAt: new Date().toISOString(),
            sampled: sample.length,
            eligible: snapshot.eligible,
            themes,
          },
        }
      : {
          status: "stale",
          result: null,
          message: "Saved answers changed. Refresh the analysis.",
        };
  } catch {
    state = {
      status: "failed",
      result: null,
      message:
        "Analysis could not complete. Check AI credits and provider availability, then retry.",
    };
  }
  if (!(await run.store.commit(lock, key, token, state, `${run.key}:latest`))) {
    return {
      status: "stale",
      result: null,
      message: "Analysis expired. Refresh to try again.",
    };
  }
  return state;
}
