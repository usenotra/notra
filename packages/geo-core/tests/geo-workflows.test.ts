import { expect, test } from "bun:test";

import {
  GEO_MAX_ENGINES,
  GEO_SHORT_FIELD_MAX_LENGTH,
} from "../src/constants/geo";
import {
  geoScanWorkflowPayloadSchema,
  geoWriterWorkflowPayloadSchema,
} from "../src/schemas/geo-workflows";

test("legacy and claimed scan payloads remain replay-compatible", () => {
  for (const payload of [
    { organizationId: "org" },
    { organizationId: "org", projectId: "project" },
    {
      organizationId: "org",
      projectId: "project",
      claimedAt: "2026-10-07T15:00:00.000Z",
      scanId: "scan",
      promptIds: ["prompt"],
      engines: ["openai"],
    },
  ]) {
    expect(geoScanWorkflowPayloadSchema.parse(payload)).toEqual(payload);
  }
});

test("invalid scan claims and empty or oversized selectors are rejected", () => {
  for (const extra of [
    { claimedAt: "2026-10-07T15:00:00.000Z" },
    { projectId: "project", scanId: "scan" },
    { projectId: "project", claimedAt: "invalid" },
    { promptIds: [] },
    { engines: [] },
    { engines: Array.from({ length: GEO_MAX_ENGINES + 1 }, () => "openai") },
    { engines: ["x".repeat(GEO_SHORT_FIELD_MAX_LENGTH + 1)] },
  ]) {
    expect(
      geoScanWorkflowPayloadSchema.safeParse({
        organizationId: "org",
        ...extra,
      }).success
    ).toBe(false);
  }
});

test("writer workflow still requires all four identifiers", () => {
  const payload = {
    organizationId: "org",
    projectId: "project",
    briefId: "brief",
    runId: "run",
  };
  expect(geoWriterWorkflowPayloadSchema.parse(payload)).toEqual(payload);
  for (const key of Object.keys(payload)) {
    expect(
      geoWriterWorkflowPayloadSchema.safeParse({ ...payload, [key]: "" })
        .success
    ).toBe(false);
  }
});
