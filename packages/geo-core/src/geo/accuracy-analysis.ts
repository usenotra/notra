import { gateway } from "@notra/ai/gateway";
import {
  queryGeoAccuracyFacts,
  queryGeoAccuracySample,
  queryGeoAccuracySnapshot,
} from "@notra/db/utils/geo-accuracy";
import { toGeoCheckWindow } from "@notra/db/utils/geo-checks";
import { Effect } from "effect";

import {
  ACCURACY_ANALYSIS_ANSWER_CHARS,
  ACCURACY_ANALYSIS_MODEL,
  ACCURACY_ANALYSIS_SAMPLE_SIZE,
} from "../constants/accuracy-analysis";
import { GeoContentBillingService } from "../deps";
import type {
  AccuracyAnalysisDefer,
  AccuracyAnalysisRun,
  AccuracyAnalysisState,
  GeoBrandFact,
} from "../types/accuracy-analysis";
import type { GeoScopeInput, GeoWindowInput } from "../types/geo";
import {
  accuracyAnalysisKey,
  accuracyFactsFingerprint,
  validateAccuracyClaims,
} from "../utils/accuracy-analysis";
import { sentimentPeriods } from "../utils/sentiment-period";
import { generateAccuracyAnalysis } from "./accuracy-analysis-agent";
import { billAccuracyAnalysis } from "./accuracy-analysis-billing";
import {
  accuracyAnalysisStore,
  readAccuracyAnalysis,
  runAccuracyAnalysis,
} from "./accuracy-analysis-cache";
import { rankAccuracyClaims } from "./accuracy-rank";
import { geoDb } from "./effect";
import { geoCheckScope, resolveGeoScope } from "./projects";

function suggestedFact(description: string | null): string | null {
  const trimmed = description?.trim() ?? "";
  return trimmed ? trimmed.slice(0, 240) : null;
}

function unavailable(
  companyName: string,
  facts: GeoBrandFact[],
  suggestion: string | null,
  message: string
): AccuracyAnalysisState {
  return {
    status: "unavailable",
    result: null,
    facts,
    suggestedFact: suggestion,
    companyName,
    message,
  };
}

export const loadGeoAccuracyAnalysis = Effect.fn("geo.accuracyAnalysis")(
  function* (
    input: GeoScopeInput,
    window: GeoWindowInput,
    analyze = false,
    defer?: AccuracyAnalysisDefer
  ) {
    const scope = yield* resolveGeoScope(input);
    const billing = yield* GeoContentBillingService;
    const checkScope = geoCheckScope(scope);
    const brand = yield* geoDb("accuracy facts lookup failed", () =>
      queryGeoAccuracyFacts(checkScope)
    );
    if (!brand?.companyName) {
      return unavailable(
        "",
        [],
        null,
        "Set the project's GEO brand name before analyzing accuracy."
      );
    }
    const facts = brand.brandFacts;
    const suggestion = suggestedFact(brand.companyDescription);
    if (facts.length === 0) {
      return unavailable(
        brand.companyName,
        facts,
        suggestion,
        "Add facts in Brand Identity → Knowledge so claims can be checked against your source of truth."
      );
    }
    const periods = sentimentPeriods(window);
    const period = periods.current;
    const store = accuracyAnalysisStore();
    const hasExtractor =
      process.env.AI_GATEWAY_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.VERCEL === "1";
    const hasJev =
      process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.VERCEL === "1";
    if (!store || (analyze && !(hasExtractor && hasJev))) {
      return unavailable(
        brand.companyName,
        facts,
        suggestion,
        "Fact checks require the evaluation model, an AI provider, and Redis."
      );
    }
    const checkWindow = toGeoCheckWindow(period);
    if (!checkWindow) {
      throw new Error("Missing accuracy window");
    }
    const key = accuracyAnalysisKey(
      input.organizationId,
      scope.projectId,
      period.from,
      period.to
    );
    const snapshot = async () => {
      const value = await queryGeoAccuracySnapshot(checkScope, checkWindow);
      return {
        ...value,
        fingerprint: accuracyAnalysisKey(
          value.fingerprint,
          null,
          accuracyFactsFingerprint(facts),
          ""
        ),
      };
    };
    return yield* geoDb("accuracy analysis failed", async () => {
      const run: AccuracyAnalysisRun = {
        key,
        store,
        companyName: brand.companyName,
        facts,
        suggestedFact: suggestion,
        snapshot,
        sample: () =>
          queryGeoAccuracySample(
            checkScope,
            checkWindow,
            ACCURACY_ANALYSIS_SAMPLE_SIZE,
            ACCURACY_ANALYSIS_ANSWER_CHARS
          ),
        extract: async (sample, owns) => {
          const output = await billAccuracyAnalysis({
            organizationId: input.organizationId,
            billing,
            owns,
            generate: () =>
              generateAccuracyAnalysis(
                gateway(ACCURACY_ANALYSIS_MODEL, {
                  organizationId: input.organizationId,
                }),
                sample,
                { companyName: brand.companyName, facts }
              ),
          });
          const extracted = validateAccuracyClaims(output, sample);
          return rankAccuracyClaims(
            extracted,
            facts,
            brand.companyName,
            input.organizationId
          );
        },
        defer,
      };
      if (!analyze) {
        return readAccuracyAnalysis(run);
      }
      return runAccuracyAnalysis(run, {
        from: periods.current.from,
        length: periods.length,
      });
    });
  }
);
