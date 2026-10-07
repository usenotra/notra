import "./utils/infrastructure";
import { afterAll, beforeAll, beforeEach, expect, mock, test } from "bun:test";

import { geoAdhocScans } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  GeoContentBillingService,
  GeoEntitlementService,
  GeoFeatureFlagService,
  GeoModelService,
} from "../src/deps";
import type { GeoAdhocScanRequest } from "../src/geo/adhoc-scan";
import { GeoScanError } from "../src/geo/errors";
import type { GeoModelServiceShape } from "../src/types/model";
import { fakeModels, testFeatureFlags } from "./constants/geo-boundaries";
import {
  database,
  initializeDatabase,
  resetDatabase,
  seedProject,
  testDb,
} from "./utils/database";

// Keep the real shared reservation/settlement functions. Only Autumn's network
// boundary is replaced, so its quota clamping and credit conversion are tested.
const checkAutumnFeature = mock();
const finalizeAutumnLock = mock();
mock.module("@notra/ai/billing/autumn", () => ({
  autumn: {
    customers: {
      getOrCreate: async () => ({ subscriptions: [] }),
    },
  },
  allowUnmeteredAiInDevelopment: false,
}));
mock.module("@notra/ai/billing/autumn-locks", () => ({
  checkAutumnFeature,
  finalizeAutumnLock,
}));

const { reserveContentBilling, confirmContentBilling, releaseContentBilling } =
  await import("@notra/ai/billing/content-billing");
const { createGeoAdhocScan, executeGeoAdhocScan } =
  await import("../src/geo/adhoc-scan");

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(async () => {
  await resetDatabase();
  checkAutumnFeature.mockReset();
  finalizeAutumnLock.mockReset();
  finalizeAutumnLock.mockResolvedValue(undefined);
});

async function execute(
  request: Omit<GeoAdhocScanRequest, "idempotencyKey">,
  models: GeoModelServiceShape = fakeModels
) {
  const { id } = await Effect.runPromise(
    Effect.gen(function* () {
      const scan = yield* createGeoAdhocScan({
        ...request,
        idempotencyKey: crypto.randomUUID(),
      });
      yield* executeGeoAdhocScan(scan.id);
      return scan;
    }).pipe(
      Effect.provideService(GeoModelService, models),
      Effect.provideService(GeoFeatureFlagService, testFeatureFlags),
      Effect.provideService(GeoEntitlementService, {
        resolveZdrEntitlement: () => Effect.succeed("not_entitled"),
        checkScanBilling: () => Effect.die("Unexpected precheck"),
      }),
      Effect.provideService(GeoContentBillingService, {
        gateContentBilling: (input) =>
          Effect.tryPromise(() => reserveContentBilling(input)),
        finalizeContentBilling: (input) =>
          Effect.tryPromise(() =>
            input.action === "release"
              ? releaseContentBilling(input.reservation)
              : confirmContentBilling(input)
          ),
      })
    )
  );
  return testDb.query.geoAdhocScans.findFirst({
    where: eq(geoAdhocScans.id, id),
  });
}

const engines = ["openai/gpt-5.4-mini", "openai/gpt-5.4"];
const allowed = {
  response: { allowed: true, balance: { remaining: 100 } },
  duplicateLock: false,
};
const exhausted = {
  response: { allowed: false, balance: { remaining: 0 } },
  duplicateLock: false,
};
const paidEmptyAnswer: GeoModelServiceShape = {
  ...fakeModels,
  answer: (input) =>
    fakeModels.answer(input).pipe(
      Effect.map((answer) => ({
        ...answer,
        text: " ",
        usage: {
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2,
          inputTokenDetails: {
            noCacheTokens: 1,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
          },
          outputTokenDetails: { textTokens: 1, reasoningTokens: 0 },
          totalUsd: 0.25,
        },
      }))
    ),
};

test("holds every runnable answer before scanning and confirms the successful count", async () => {
  const scope = await seedProject("billing-count");
  checkAutumnFeature.mockResolvedValue(allowed);
  const scan = await execute({
    ...scope,
    prompt: "best tools",
    engines,
    webSearch: false,
  });
  expect(scan?.status).toBe("completed");
  expect(checkAutumnFeature).toHaveBeenCalledTimes(1);
  expect(checkAutumnFeature.mock.calls[0]?.[0]).toMatchObject({
    featureId: "ai_answers",
    requiredBalance: 2,
  });
  expect(finalizeAutumnLock).toHaveBeenCalledWith(
    expect.any(String),
    "confirm",
    2,
    expect.any(Object)
  );
});

test("releases the answer quota when paid provider usage produced no successful answer", async () => {
  const scope = await seedProject("billing-empty-quota");
  checkAutumnFeature.mockResolvedValue(allowed);
  const scan = await execute(
    {
      ...scope,
      prompt: "best tools",
      engines: engines.slice(0, 1),
      webSearch: false,
    },
    paidEmptyAnswer
  );
  expect(scan?.status).toBe("failed");
  expect(scan?.errorCode).toBe("no_answers");
  expect(finalizeAutumnLock.mock.calls).toEqual([
    [expect.any(String), "release"],
  ]);
});

test("confirms actual incurred credit cost for an empty paid answer", async () => {
  const scope = await seedProject("billing-empty-credits");
  checkAutumnFeature
    .mockResolvedValueOnce(exhausted)
    .mockResolvedValueOnce(allowed);
  const scan = await execute(
    {
      ...scope,
      prompt: "best tools",
      engines: engines.slice(0, 1),
      webSearch: false,
    },
    paidEmptyAnswer
  );
  expect(scan?.status).toBe("failed");
  expect(finalizeAutumnLock).toHaveBeenCalledTimes(1);
  expect(finalizeAutumnLock).toHaveBeenCalledWith(
    expect.stringContaining(":ai_credits"),
    "confirm",
    25,
    expect.any(Object)
  );
});

test("a partial success holds two answers but only consumes one", async () => {
  const scope = await seedProject("billing-partial");
  checkAutumnFeature.mockResolvedValue(allowed);
  const scan = await execute(
    { ...scope, prompt: "best tools", engines, webSearch: false },
    {
      ...fakeModels,
      answer: (input) =>
        input.engine === engines[1]
          ? Effect.fail(new GeoScanError({ message: "provider down" }))
          : fakeModels.answer(input),
    }
  );
  expect(scan?.status).toBe("completed");
  expect(scan?.results?.checks).toHaveLength(1);
  expect(checkAutumnFeature.mock.calls[0]?.[0]).toMatchObject({
    requiredBalance: 2,
  });
  expect(finalizeAutumnLock).toHaveBeenCalledWith(
    expect.any(String),
    "confirm",
    1,
    expect.any(Object)
  );
});

test("insufficient quota and credits deny the whole multi-model run before model calls", async () => {
  const scope = await seedProject("billing-denied");
  checkAutumnFeature.mockResolvedValue(exhausted);
  const scan = await execute(
    { ...scope, prompt: "best tools", engines, webSearch: false },
    {
      ...fakeModels,
      answer: () => Effect.die("Model called after billing denied"),
    }
  );
  expect(scan?.errorCode).toBe("credits_exhausted");
  expect(checkAutumnFeature.mock.calls[0]?.[0]).toMatchObject({
    requiredBalance: 2,
  });
  expect(finalizeAutumnLock).not.toHaveBeenCalled();
});
