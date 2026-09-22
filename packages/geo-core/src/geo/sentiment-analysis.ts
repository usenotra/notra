import { gateway } from "@notra/ai/gateway";
import {
  queryGeoSentimentAnalysisSample,
  queryGeoSentimentAnalysisSnapshot,
  toGeoCheckWindow,
  queryGeoSentimentBrand,
} from "@notra/db/utils/geo-checks";
import { Effect } from "effect";

import {
  SENTIMENT_ANALYSIS_ANSWER_CHARS,
  SENTIMENT_ANALYSIS_MODEL,
  SENTIMENT_ANALYSIS_SAMPLE_PER_POLARITY,
} from "../constants/sentiment-analysis";
import { GeoContentBillingService } from "../deps";
import type { GeoScopeInput, GeoWindowInput } from "../types/geo";
import type {
  SentimentAnalysisDefer,
  SentimentAnalysisSnapshot,
  SentimentAnalysisState,
  SentimentAnalysisStore,
} from "../types/sentiment-analysis";
import {
  sentimentAnalysisKey,
  sentimentAnalysisLookupKeys,
} from "../utils/sentiment-analysis";
import { sentimentPeriods } from "../utils/sentiment-period";
import { geoDb } from "./effect";
import { geoCheckScope, resolveGeoScope } from "./projects";
import { generateSentimentAnalysis } from "./sentiment-analysis-agent";
import { billSentimentAnalysis } from "./sentiment-analysis-billing";
import {
  readSentimentAnalysis,
  runSentimentAnalysis,
  sentimentAnalysisStore,
} from "./sentiment-analysis-cache";

async function readProjectSentimentAnalysis(
  organizationId: string,
  projectId: string,
  period: { from: string; to: string },
  store: SentimentAnalysisStore,
  snapshot: () => Promise<SentimentAnalysisSnapshot>
) {
  const frozen = await snapshot();
  const read = (key: string) =>
    readSentimentAnalysis({
      key,
      store,
      snapshot: async () => frozen,
    });
  const [currentKey, ...legacyKeys] = sentimentAnalysisLookupKeys(
    organizationId,
    projectId,
    period.from,
    period.to
  );
  const current = await read(currentKey);
  if (current.result || current.status === "pending") {
    return current;
  }
  for (const key of legacyKeys) {
    const legacy = await read(key);
    if (legacy.result) {
      return legacy;
    }
  }
  return current;
}

export const loadGeoSentimentAnalysis = Effect.fn("geo.sentimentAnalysis")(
  function* (
    input: GeoScopeInput,
    window: GeoWindowInput,
    analyze = false,
    defer?: SentimentAnalysisDefer
  ) {
    const scope = yield* resolveGeoScope(input);
    const billing = yield* GeoContentBillingService;
    const brand = yield* geoDb("sentiment brand lookup failed", () =>
      queryGeoSentimentBrand(geoCheckScope(scope))
    );
    if (!brand?.companyName) {
      return {
        status: "unavailable",
        result: null,
        message: "Set the project's GEO brand name before analyzing sentiment.",
      } satisfies SentimentAnalysisState;
    }
    const period = sentimentPeriods(window).current;
    const store = sentimentAnalysisStore();
    if (
      !store ||
      (analyze &&
        !(
          process.env.AI_GATEWAY_API_KEY ||
          process.env.OPENROUTER_API_KEY ||
          process.env.VERCEL_OIDC_TOKEN ||
          process.env.VERCEL === "1"
        ))
    ) {
      return {
        status: "unavailable",
        result: null,
        message:
          "Sentiment analysis requires the AI provider and Redis cache to be configured.",
      } satisfies SentimentAnalysisState;
    }
    const checkScope = geoCheckScope(scope);
    const checkWindow = toGeoCheckWindow(period);
    if (!checkWindow) {
      throw new Error("Missing sentiment window");
    }
    let companyName = brand.companyName;
    const key = sentimentAnalysisKey(input.organizationId, scope.projectId);
    const snapshot = async () => {
      const currentBrand = await queryGeoSentimentBrand(checkScope);
      companyName = currentBrand?.companyName ?? "";
      const value = await queryGeoSentimentAnalysisSnapshot(
        checkScope,
        checkWindow
      );
      return {
        ...value,
        fingerprint: sentimentAnalysisKey(value.fingerprint, null, companyName),
      };
    };
    return yield* geoDb("sentiment analysis failed", async () => {
      if (!analyze) {
        return readProjectSentimentAnalysis(
          input.organizationId,
          scope.projectId,
          period,
          store,
          snapshot
        );
      }
      return runSentimentAnalysis({
        key,
        store,
        snapshot,
        sample: () =>
          queryGeoSentimentAnalysisSample(
            checkScope,
            checkWindow,
            SENTIMENT_ANALYSIS_SAMPLE_PER_POLARITY,
            SENTIMENT_ANALYSIS_ANSWER_CHARS
          ),
        extract: (sample, owns) =>
          billSentimentAnalysis({
            organizationId: input.organizationId,
            billing,
            owns,
            generate: () =>
              generateSentimentAnalysis(
                gateway(SENTIMENT_ANALYSIS_MODEL, {
                  organizationId: input.organizationId,
                }),
                sample,
                companyName
              ),
          }),
        defer,
      });
    });
  }
);

/** Reads cached analysis state without requiring billing or starting a model run. */
export const loadStoredGeoSentimentAnalysis = Effect.fn(
  "geo.storedSentimentAnalysis"
)(function* (input: GeoScopeInput, window: GeoWindowInput) {
  const scope = yield* resolveGeoScope(input);
  const brand = yield* geoDb("sentiment brand lookup failed", () =>
    queryGeoSentimentBrand(geoCheckScope(scope))
  );
  if (!brand?.companyName) {
    return {
      status: "unavailable",
      result: null,
      message: "Set the project's GEO brand name before analyzing sentiment.",
    } satisfies SentimentAnalysisState;
  }
  const period = sentimentPeriods(window).current;
  const store = sentimentAnalysisStore();
  if (!store) {
    return {
      status: "unavailable",
      result: null,
      message: "Sentiment analysis requires the Redis cache to be configured.",
    } satisfies SentimentAnalysisState;
  }
  const checkScope = geoCheckScope(scope);
  const checkWindow = toGeoCheckWindow(period);
  if (!checkWindow) {
    throw new Error("Missing sentiment window");
  }
  return yield* geoDb("sentiment analysis failed", () =>
    readProjectSentimentAnalysis(
      input.organizationId,
      scope.projectId,
      period,
      store,
      async () => {
        const currentBrand = await queryGeoSentimentBrand(checkScope);
        const companyName = currentBrand?.companyName ?? "";
        const value = await queryGeoSentimentAnalysisSnapshot(
          checkScope,
          checkWindow
        );
        return {
          ...value,
          fingerprint: sentimentAnalysisKey(
            value.fingerprint,
            null,
            companyName
          ),
        };
      }
    )
  );
});
