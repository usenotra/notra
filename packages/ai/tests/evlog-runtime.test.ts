import { afterEach, beforeEach, expect, mock, test } from "bun:test";

import type { EvlogGlobal } from "../src/types/evlog";

const originalEnv = {
  AXIOM_TOKEN: process.env.AXIOM_TOKEN,
  AXIOM_AI_DATASET: process.env.AXIOM_AI_DATASET,
  AXIOM_GEO_DATASET: process.env.AXIOM_GEO_DATASET,
  AXIOM_ORG_ID: process.env.AXIOM_ORG_ID,
};
const host = globalThis as EvlogGlobal;
const originalRuntime = host.__notraEvlogRuntime;
const createAxiomPipeline = mock((_config: unknown) =>
  Object.assign(
    mock(() => {}),
    { flush: async () => {} }
  )
);
mock.module("@notra/ai/utils/axiom-pipeline", () => ({ createAxiomPipeline }));
const { getEvlogRuntime } = await import("../src/utils/evlog-runtime");

beforeEach(() => {
  delete host.__notraEvlogRuntime;
  for (const key of Object.keys(originalEnv)) {
    delete process.env[key];
  }
  createAxiomPipeline.mockClear();
});

afterEach(() => {
  host.__notraEvlogRuntime = originalRuntime;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

test.each([undefined, ""])(
  "defaults datasets when overrides are %p",
  (value) => {
    process.env.AXIOM_TOKEN = "test-token";
    if (value !== undefined) {
      process.env.AXIOM_AI_DATASET = value;
      process.env.AXIOM_GEO_DATASET = value;
    }
    const runtime = getEvlogRuntime();
    expect(runtime.aiDrain).toBeDefined();
    expect(runtime.geoDrain).toBeDefined();
    expect(createAxiomPipeline.mock.calls).toEqual([
      [{ apiKey: "test-token", dataset: "ai-logs", orgId: undefined }],
      [{ apiKey: "test-token", dataset: "notra-geo-scan", orgId: undefined }],
    ]);
  }
);

test("preserves dataset and organization overrides", () => {
  process.env.AXIOM_TOKEN = "test-token";
  process.env.AXIOM_AI_DATASET = "staging-ai";
  process.env.AXIOM_GEO_DATASET = "staging-geo";
  process.env.AXIOM_ORG_ID = "staging-org";
  getEvlogRuntime();
  expect(createAxiomPipeline.mock.calls).toEqual([
    [{ apiKey: "test-token", dataset: "staging-ai", orgId: "staging-org" }],
    [{ apiKey: "test-token", dataset: "staging-geo", orgId: "staging-org" }],
  ]);
});

test.each([undefined, ""])(
  "disables ingestion when the token is %p",
  (value) => {
    if (value !== undefined) {
      process.env.AXIOM_TOKEN = value;
    }
    const runtime = getEvlogRuntime();
    expect(runtime.aiDrain).toBeUndefined();
    expect(runtime.geoDrain).toBeUndefined();
    expect(createAxiomPipeline).not.toHaveBeenCalled();
  }
);
