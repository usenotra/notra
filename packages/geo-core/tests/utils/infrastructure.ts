import { mock } from "bun:test";

import { Effect } from "effect";

import { seedGeoModelCatalog } from "../../src/utils/geo-model-catalog";
import { testDb } from "./database";

// Install once per Bun process, before importing modules that consume these
// boundaries. Every DB-backed test file imports this module explicitly.
mock.module("@notra/db/drizzle", () => ({ db: testDb }));
mock.module("@notra/ai/evlog", () => ({
  geoLog: { info: mock(), warn: mock(), error: mock() },
  geoLogDrainEnabled: true,
  flushGeoLog: async () => undefined,
}));

export const cleanupBoxes = mock(async () => undefined);
mock.module("@notra/ai/utils/geo-opencode-box", () => ({
  deleteStaleGeoOpenCodeBoxes: cleanupBoxes,
}));

// The catalog feed is a separate network boundary; paid SDKs are never mocked.
mock.module("../../src/geo/model-catalog", () => ({
  loadGeoModelCatalog: () => Effect.succeed(seedGeoModelCatalog()),
}));
mock.module("@notra/ai/agents/geo-opencode", () => ({
  askGeoOpenCode: () => {
    throw new Error("Unexpected OpenCode request");
  },
  askGeoOpenCodeConversation: () => {
    throw new Error("Unexpected OpenCode conversation");
  },
}));
