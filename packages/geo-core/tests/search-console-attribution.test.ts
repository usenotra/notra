import { afterAll, beforeAll, expect, mock, spyOn, test } from "bun:test";

import type { GscIntegrationRow } from "@notra/ai/types/google-search-console";
import { Effect } from "effect";

import { GeoModelService, GeoSearchConsoleService } from "../src/deps";
import type { GscSuggestionGenerationParams } from "../src/types/google-search-console";
import { fakeModels } from "./constants/geo-boundaries";

// The callbacks handed to geoDb are never run; accessing a real DB is a failure.
mock.module("@notra/db/drizzle", () => ({
  db: new Proxy(
    {},
    {
      get: () => {
        throw new Error("Unexpected database access");
      },
    }
  ),
}));
const actualEffect = await import("../src/geo/effect");
mock.module("../src/geo/effect", () => ({
  ...actualEffect,
  geoDb: (label: string) => {
    switch (label) {
      case "read Search Console project":
        return Effect.succeed({
          brandSettingsId: "gsc-brand",
          gscSiteUrl: "https://example.com",
        });
      case "read suggestion settings":
        return Effect.succeed({
          companyName: "Example",
          aliases: [],
          competitors: [],
        });
      case "read suggestion brand":
        return Effect.succeed({ companyDescription: "Email tools" });
      case "read suggestion competitors":
      case "read tracked suggestions":
      case "read prior suggestions":
        return Effect.succeed([]);
      case "commit Search Console suggestions":
        return Effect.succeed(0);
      default:
        return Effect.die(new Error(`Unexpected database boundary: ${label}`));
    }
  },
}));

const { selectGscSiteAndSyncSuggestions } =
  await import("../src/geo/search-console");
const network = spyOn(globalThis, "fetch");
beforeAll(() =>
  network.mockImplementation(() => {
    throw new Error("Unexpected network access");
  })
);
afterAll(() => network.mockRestore());

test("GSC sync passes the integration organization to suggestion generation", async () => {
  const integration: GscIntegrationRow = {
    id: "gsc-integration",
    organizationId: "gsc-owner-org",
    createdByUserId: null,
    googleAccountEmail: null,
    encryptedAccessToken: "unused",
    encryptedRefreshToken: "unused",
    accessTokenExpiresAt: new Date("2099-01-01"),
    siteUrl: "https://example.com",
    status: "active",
    qstashScheduleId: null,
    disconnectingAt: null,
    lastSyncedAt: null,
    lastError: null,
    topQueries: [],
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };
  const keywords = [
    { query: "email tools", clicks: 4, impressions: 120, position: 6 },
  ];
  const suggest = mock((_input: GscSuggestionGenerationParams) =>
    Effect.succeed({ prompts: [] })
  );
  const topQueries = mock(() => Effect.succeed(keywords));
  const result = await Effect.runPromise(
    selectGscSiteAndSyncSuggestions(
      integration,
      "https://example.com",
      "gsc-project"
    ).pipe(
      Effect.provideService(GeoModelService, { ...fakeModels, suggest }),
      Effect.provideService(GeoSearchConsoleService, { topQueries })
    )
  );

  expect(result).toEqual({
    status: "completed",
    keywords: 1,
    suggestionsAdded: 0,
  });
  expect(suggest).toHaveBeenCalledTimes(1);
  expect(suggest).toHaveBeenCalledWith({
    organizationId: "gsc-owner-org",
    companyName: "Example",
    companyDescription: "Email tools",
    competitors: [],
    siteUrl: "https://example.com",
    keywords,
    existingPrompts: [],
  });
  expect(topQueries).toHaveBeenCalledTimes(1);
  expect(network).not.toHaveBeenCalled();
});
