import { db } from "@notra/db/drizzle";
import { geoSettings } from "@notra/db/schema";
import {
  queryGeoSentimentAnalysisSnapshot,
  toGeoCheckWindow,
} from "@notra/db/utils/geo-checks";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { Effect } from "effect";

import type { GeoScopeInput } from "../types/geo";
import { sentimentPeriods } from "../utils/sentiment-period";
import { geoDb } from "./effect";
import { geoCheckScope, resolveGeoScope } from "./projects";
import { loadGeoSentimentAnalysis } from "./sentiment-analysis";

export const sentimentAutomation = Effect.fn("geo.sentimentAutomation")(
  function* (input: GeoScopeInput) {
    const scope = yield* resolveGeoScope(input);
    if (!scope.projectId) {
      return { lastAttemptAt: null };
    }
    const projectId = scope.projectId;
    const where = and(
      eq(geoSettings.organizationId, input.organizationId),
      eq(geoSettings.projectId, projectId)
    );
    return yield* geoDb("sentiment automation settings failed", async () => {
      const [row] = await db
        .select({
          lastAttemptAt: geoSettings.sentimentAttemptedAt,
        })
        .from(geoSettings)
        .where(where);
      return {
        lastAttemptAt: row?.lastAttemptAt?.toISOString() ?? null,
      };
    });
  }
);

export const runAutomaticSentiment = Effect.fn("geo.runAutomaticSentiment")(
  function* (input: GeoScopeInput) {
    const settings = yield* sentimentAutomation(input);
    const window = sentimentPeriods({ days: 30 }).current;
    const existing = yield* loadGeoSentimentAnalysis(input, window);
    if (
      existing.status === "ready" ||
      existing.status === "pending" ||
      existing.status === "unavailable"
    ) {
      return;
    }
    const scope = yield* resolveGeoScope(input);
    if (!scope.projectId) {
      return;
    }
    const projectId = scope.projectId;
    // Atomic persisted throttle also prevents workflow retries from charging twice.
    const checkWindow = toGeoCheckWindow(window);
    if (!checkWindow) {
      return;
    }
    const latest = yield* geoDb(
      "sentiment automation input lookup failed",
      () => queryGeoSentimentAnalysisSnapshot(geoCheckScope(scope), checkWindow)
    );
    if (
      !latest.latestCapturedAt ||
      (settings.lastAttemptAt &&
        new Date(latest.latestCapturedAt).getTime() <=
          new Date(settings.lastAttemptAt).getTime())
    ) {
      return;
    }
    const now = new Date();
    const claimed = yield* geoDb("sentiment automation claim failed", () =>
      db
        .update(geoSettings)
        .set({ sentimentAttemptedAt: now })
        .where(
          and(
            eq(geoSettings.organizationId, input.organizationId),
            eq(geoSettings.projectId, projectId),
            or(
              isNull(geoSettings.sentimentAttemptedAt),
              lt(
                geoSettings.sentimentAttemptedAt,
                new Date(now.getTime() - 86_400_000)
              )
            )
          )
        )
        .returning({ id: geoSettings.id })
    );
    if (!claimed.length) {
      return;
    }
    return yield* loadGeoSentimentAnalysis(input, window, true);
  }
);
