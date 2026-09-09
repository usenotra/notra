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
import type { SentimentAnalysisState } from "../types/sentiment-analysis";
import { sentimentAnalysisKey } from "../utils/sentiment-analysis";
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

export const loadGeoSentimentAnalysis = Effect.fn("geo.sentimentAnalysis")(
  function* (input: GeoScopeInput, window: GeoWindowInput, analyze = false) {
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
      !(
        process.env.AI_GATEWAY_API_KEY ||
        process.env.OPENROUTER_API_KEY ||
        process.env.VERCEL_OIDC_TOKEN ||
        process.env.VERCEL === "1"
      )
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
    const companyName = brand.companyName;
    const key = sentimentAnalysisKey(
      input.organizationId,
      scope.projectId,
      period.from,
      period.to
    );
    const snapshot = async () => {
      const value = await queryGeoSentimentAnalysisSnapshot(
        checkScope,
        checkWindow
      );
      return {
        ...value,
        fingerprint: sentimentAnalysisKey(
          value.fingerprint,
          null,
          brand.companyName ?? "",
          ""
        ),
      };
    };
    return yield* geoDb("sentiment analysis failed", async () => {
      if (!analyze) {
        return readSentimentAnalysis({ key, store, snapshot });
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
      });
    });
  }
);
