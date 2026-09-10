import { db } from "@notra/db/drizzle";
import { brandSettings, geoAgentReadinessReports } from "@notra/db/schema";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { Effect } from "effect";

import { AGENT_READINESS_HISTORY_LIMIT } from "../constants/agent-readiness";
import { GeoWorkflowService, AgentReadinessNetwork } from "../deps";
import {
  AgentReadinessApiError,
  AgentReadinessTargetMissingError,
  AgentReadinessClaimError,
  AgentReadinessStampError,
  AgentReadinessStartError,
} from "../schemas/agent-readiness-errors";
import type {
  AgentReadinessHistoryPoint,
  AgentReadinessReportView,
  AgentReadinessReportRow,
  AgentReadinessResponse,
  AgentReadinessScanResponse,
  AgentReadinessScope,
  AgentReadinessWorkflowPayload,
  AgentReadinessWorkflowResult,
} from "../types/agent-readiness";
import { canReuseAgentReadinessScan } from "../utils/agent-readiness";
import {
  areWebsiteUrlsEquivalent,
  getWebsiteUrlLookupVariants,
  normalizeWebsiteUrl,
} from "../utils/geo-website";
import { geoDb } from "./effect";

function toReportView(row: AgentReadinessReportRow): AgentReadinessReportView {
  return {
    id: row.id,
    status: row.status,
    targetUrl: row.targetUrl,
    score: row.score,
    scoreLabel: row.scoreLabel,
    scoreBreakdown: row.scoreBreakdown ?? null,
    issues: row.issues,
    eligibleChecks: row.eligibleChecks,
    reportUrl: row.reportUrl,
    errorMessage: row.errorMessage,
    scannedAt: row.scannedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

const resolveTargetUrl = Effect.fn("geo.agentReadiness.target")(function* (
  brandSettingsId: string
) {
  const brand = yield* geoDb("read readiness target", () =>
    db.query.brandSettings.findFirst({
      columns: { websiteUrl: true },
      where: eq(brandSettings.id, brandSettingsId),
    })
  );
  const targetUrl = brand?.websiteUrl
    ? normalizeWebsiteUrl(brand.websiteUrl)
    : null;
  if (!targetUrl) {
    return yield* Effect.fail(
      new AgentReadinessTargetMissingError({
        message: "Add a website URL in brand settings before scanning",
      })
    );
  }
  return targetUrl;
});

async function latestRowWhere(
  projectId: string,
  status?: AgentReadinessReportRow["status"],
  targetUrl?: string
): Promise<AgentReadinessReportRow | undefined> {
  const conditions = [eq(geoAgentReadinessReports.projectId, projectId)];
  if (status) {
    conditions.push(eq(geoAgentReadinessReports.status, status));
  }
  if (targetUrl) {
    conditions.push(
      inArray(
        geoAgentReadinessReports.targetUrl,
        getWebsiteUrlLookupVariants(targetUrl)
      )
    );
  }
  return await db.query.geoAgentReadinessReports.findFirst({
    where: and(...conditions),
    orderBy: desc(geoAgentReadinessReports.createdAt),
  });
}

async function loadHistory(
  projectId: string,
  targetUrl: string
): Promise<AgentReadinessHistoryPoint[]> {
  const rows = await db.query.geoAgentReadinessReports.findMany({
    columns: {
      id: true,
      score: true,
      issues: true,
      scannedAt: true,
      createdAt: true,
    },
    where: and(
      eq(geoAgentReadinessReports.projectId, projectId),
      inArray(
        geoAgentReadinessReports.targetUrl,
        getWebsiteUrlLookupVariants(targetUrl)
      ),
      eq(geoAgentReadinessReports.status, "completed")
    ),
    orderBy: desc(geoAgentReadinessReports.createdAt),
    limit: AGENT_READINESS_HISTORY_LIMIT,
  });
  return rows
    .map((row) => ({
      id: row.id,
      score: row.score,
      failedCount: row.issues.filter((issue) => issue.result === "failed")
        .length,
      partialCount: row.issues.filter((issue) => issue.result === "partial")
        .length,
      scannedAt: (row.scannedAt ?? row.createdAt).toISOString(),
    }))
    .reverse();
}

export const loadAgentReadiness = Effect.fn("geo.agentReadiness.load")(
  function* (scope: AgentReadinessScope) {
    const targetUrl = yield* resolveTargetUrl(scope.brandSettingsId);
    const [completed, latest, history] = yield* Effect.all(
      [
        geoDb("read completed readiness", () =>
          latestRowWhere(scope.projectId, "completed", targetUrl)
        ),
        geoDb("read latest readiness", () =>
          latestRowWhere(scope.projectId, undefined, targetUrl)
        ),
        geoDb("read readiness history", () =>
          loadHistory(scope.projectId, targetUrl)
        ),
      ],
      { concurrency: "unbounded" }
    );

    const report = completed ? toReportView(completed) : null;
    const scan =
      latest && latest.id !== completed?.id ? toReportView(latest) : null;
    return {
      targetUrl,
      report,
      scan,
      history,
    } satisfies AgentReadinessResponse;
  }
);

export const startAgentReadinessScan = Effect.fn("geo.agentReadiness.start")(
  function* (scope: AgentReadinessScope) {
    const workflows = yield* GeoWorkflowService;
    const claim = yield* Effect.gen(function* () {
      const [targetUrl, running] = yield* Effect.all([
        resolveTargetUrl(scope.brandSettingsId),
        geoDb("read running readiness", () =>
          latestRowWhere(scope.projectId, "running")
        ),
      ]);
      if (running && canReuseAgentReadinessScan(running, targetUrl)) {
        return {
          alreadyRunning: true as const,
          response: { reportId: running.id, alreadyRunning: true as const },
        };
      }

      if (running) {
        const targetChanged = !areWebsiteUrlsEquivalent(
          running.targetUrl,
          targetUrl
        );
        yield* geoDb("replace readiness scan", () =>
          db
            .update(geoAgentReadinessReports)
            .set({
              status: "failed",
              errorMessage: targetChanged
                ? "Scan replaced after the website URL changed."
                : "Scan timed out before completion.",
            })
            .where(
              and(
                eq(geoAgentReadinessReports.id, running.id),
                eq(geoAgentReadinessReports.status, "running")
              )
            )
        );
      }

      const reportId = crypto.randomUUID();
      const inserted = yield* geoDb("claim readiness scan", () =>
        db
          .insert(geoAgentReadinessReports)
          .values({
            id: reportId,
            organizationId: scope.organizationId,
            projectId: scope.projectId,
            targetUrl,
          })
          .onConflictDoNothing()
          .returning({ id: geoAgentReadinessReports.id })
      );
      if (inserted.length === 0) {
        const winner = yield* geoDb("read readiness claim winner", () =>
          latestRowWhere(scope.projectId, "running", targetUrl)
        );
        if (!winner || !canReuseAgentReadinessScan(winner, targetUrl)) {
          return yield* Effect.fail(
            new AgentReadinessClaimError({
              message: "Failed to claim agent readiness scan",
            })
          );
        }
        return {
          alreadyRunning: true as const,
          response: { reportId: winner.id, alreadyRunning: true as const },
        };
      }
      return { alreadyRunning: false as const, reportId, targetUrl };
    });

    if (claim.alreadyRunning) {
      return claim.response;
    }

    const response: AgentReadinessScanResponse = {
      reportId: claim.reportId,
      alreadyRunning: false,
    };
    return yield* workflows
      .startAgentReadinessRun({
        organizationId: scope.organizationId,
        projectId: scope.projectId,
        reportId: claim.reportId,
        targetUrl: claim.targetUrl,
      })
      .pipe(
        Effect.mapError((cause) => new AgentReadinessStartError({ cause })),
        Effect.map(() => response),
        Effect.catch((error) =>
          geoDb("stamp failed readiness handoff", () =>
            db
              .update(geoAgentReadinessReports)
              .set({
                status: "failed",
                errorMessage: "Scan could not be started. Please try again.",
              })
              .where(
                and(
                  eq(geoAgentReadinessReports.id, claim.reportId),
                  eq(geoAgentReadinessReports.status, "running")
                )
              )
          ).pipe(
            Effect.mapError(
              (stampCause) =>
                new AgentReadinessStampError({ cause: error, stampCause })
            ),
            Effect.andThen(Effect.fail(error))
          )
        )
      );
  }
);

async function latestCompletedBefore(
  projectId: string,
  targetUrl: string,
  excludeReportId: string
): Promise<AgentReadinessReportRow | undefined> {
  return await db.query.geoAgentReadinessReports.findFirst({
    where: and(
      eq(geoAgentReadinessReports.projectId, projectId),
      inArray(
        geoAgentReadinessReports.targetUrl,
        getWebsiteUrlLookupVariants(targetUrl)
      ),
      eq(geoAgentReadinessReports.status, "completed"),
      ne(geoAgentReadinessReports.id, excludeReportId)
    ),
    orderBy: desc(geoAgentReadinessReports.createdAt),
  });
}

/**
 * Reuses an already stored is-agentic report when it is newer than what we
 * have; otherwise runs a fresh scan. Mirrors the CLI: never forces a rescan
 * when the remote report is new to us.
 */
export const executeAgentReadinessScan = Effect.fn(
  "geo.agentReadiness.execute"
)(function* (payload: AgentReadinessWorkflowPayload) {
  const network = yield* AgentReadinessNetwork;
  return yield* Effect.gen(function* () {
    const previous = yield* geoDb("read previous readiness", () =>
      latestCompletedBefore(
        payload.projectId,
        payload.targetUrl,
        payload.reportId
      )
    );
    let report = yield* network.report(payload.targetUrl);
    const alreadySeen = Boolean(
      report?.scannedAt &&
      previous?.scannedAt &&
      report.scannedAt.getTime() <= previous.scannedAt.getTime()
    );
    if (!report || alreadySeen) {
      yield* network.scan(payload.targetUrl);
      report = yield* network.report(payload.targetUrl);
    }
    if (!report) {
      return yield* Effect.fail(
        new AgentReadinessApiError({
          message: "The scan finished without a stored report",
        })
      );
    }

    const feedbackMdIssue = yield* network.feedback(payload.targetUrl);
    const issues = feedbackMdIssue
      ? [...report.issues, feedbackMdIssue]
      : report.issues;

    const updated = yield* geoDb("complete readiness scan", () =>
      db
        .update(geoAgentReadinessReports)
        .set({
          status: "completed",
          score: report.score,
          scoreLabel: report.scoreLabel,
          scoreBreakdown: report.scoreBreakdown,
          // feedback.md is a Notra bonus check, so it does not alter the
          // externally owned Is Agentic score or breakdown.
          issues,
          eligibleChecks: report.eligibleChecks,
          reportUrl: report.reportUrl,
          errorMessage: null,
          scannedAt: report.scannedAt ?? new Date(),
        })
        .where(
          and(
            eq(geoAgentReadinessReports.id, payload.reportId),
            eq(geoAgentReadinessReports.organizationId, payload.organizationId),
            eq(geoAgentReadinessReports.projectId, payload.projectId),
            eq(geoAgentReadinessReports.targetUrl, payload.targetUrl),
            eq(geoAgentReadinessReports.status, "running")
          )
        )
        .returning({ id: geoAgentReadinessReports.id })
    );
    if (updated.length === 0) {
      return {
        status: "failed",
        reason: "Scan was replaced before completion.",
      } satisfies AgentReadinessWorkflowResult;
    }
    return { status: "completed" } satisfies AgentReadinessWorkflowResult;
  }).pipe(
    Effect.catch((error) =>
      Effect.gen(function* () {
        const reason =
          error instanceof AgentReadinessApiError
            ? error.message
            : "Scan failed. Please try again.";
        console.error("[AgentReadiness] Scan failed:", error);
        yield* geoDb("stamp failed readiness scan", () =>
          db
            .update(geoAgentReadinessReports)
            .set({ status: "failed", errorMessage: reason })
            .where(
              and(
                eq(geoAgentReadinessReports.id, payload.reportId),
                eq(
                  geoAgentReadinessReports.organizationId,
                  payload.organizationId
                ),
                eq(geoAgentReadinessReports.projectId, payload.projectId),
                eq(geoAgentReadinessReports.targetUrl, payload.targetUrl),
                eq(geoAgentReadinessReports.status, "running")
              )
            )
        ).pipe(
          Effect.mapError(
            (stampCause) =>
              new AgentReadinessStampError({ cause: error, stampCause })
          )
        );
        return {
          status: "failed",
          reason,
        } satisfies AgentReadinessWorkflowResult;
      })
    )
  );
});
