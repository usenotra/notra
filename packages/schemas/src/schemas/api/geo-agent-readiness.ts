import "zod/compile";
import { z } from "@hono/zod-openapi";

import { organizationResponseSchema } from "./content";

const readinessTierSchema = z.object({
  earned: z.number(),
  available: z.number(),
  passing: z.number(),
  total: z.number(),
});

const readinessScoreBreakdownSchema = z.object({
  essential: readinessTierSchema,
  recommended: readinessTierSchema,
  bonus: z.object({
    points: z.number(),
    positiveSignals: z.number(),
  }),
});

const readinessIssueSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.enum(["essential", "recommended", "bonus"]),
  result: z.enum(["failed", "partial"]),
  details: z.string().nullable(),
  recommendation: z.string().nullable(),
});

const readinessReportSchema = z
  .object({
    id: z.string(),
    status: z.enum(["running", "completed", "failed"]),
    targetUrl: z.string(),
    score: z.number().nullable(),
    scoreLabel: z.string().nullable(),
    scoreBreakdown: readinessScoreBreakdownSchema.nullable(),
    issues: z.array(readinessIssueSchema),
    eligibleChecks: z.number().int().nullable(),
    reportUrl: z.string().nullable(),
    errorMessage: z.string().nullable(),
    scannedAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .openapi("GeoAgentReadinessReport");

const readinessHistoryPointSchema = z.object({
  id: z.string(),
  score: z.number().nullable(),
  failedCount: z.number().int(),
  partialCount: z.number().int(),
  scannedAt: z.string(),
});

export const agentReadinessResponseSchema = z
  .object({
    targetUrl: z.string(),
    report: readinessReportSchema.nullable().openapi({
      description: "Latest completed report, if any.",
    }),
    scan: readinessReportSchema.nullable().openapi({
      description: "Latest run newer than the completed report, if any.",
    }),
    history: z.array(readinessHistoryPointSchema).openapi({
      description: "Completed scans, oldest first.",
    }),
    organization: organizationResponseSchema,
  })
  .openapi("GeoAgentReadinessResponse");

export const agentReadinessScanResponseSchema = z
  .object({
    reportId: z.string(),
    alreadyRunning: z.boolean().openapi({
      description:
        "True when an in-flight scan for the same URL was reused instead of starting a new one.",
    }),
    organization: organizationResponseSchema,
  })
  .openapi("GeoAgentReadinessScanResponse");
