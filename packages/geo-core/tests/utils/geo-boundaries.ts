import {
  geoAgentReadinessReports,
  geoPromptSuggestions,
  googleSearchConsoleIntegrations,
} from "@notra/db/schema";
import { Effect } from "effect";

import {
  AgentReadinessNetwork,
  GeoModelService,
  GeoSearchConsoleService,
} from "../../src/deps";
import type {
  AgentReadinessNetworkShape,
  AgentReadinessWorkflowPayload,
} from "../../src/types/agent-readiness";
import type { GeoModelServiceShape } from "../../src/types/model";
import { fakeModels, readinessNetwork } from "../constants/geo-boundaries";
import { seedProject, testDb } from "./database";

export function withGscServices<A, E>(
  effect: Effect.Effect<A, E, GeoModelService | GeoSearchConsoleService>,
  models: GeoModelServiceShape = fakeModels
) {
  return effect.pipe(
    Effect.provideService(GeoModelService, models),
    Effect.provideService(GeoSearchConsoleService, {
      topQueries: () =>
        Effect.succeed([
          { query: "email tools", clicks: 4, impressions: 120, position: 6 },
        ]),
    })
  );
}

export function withReadiness<A, E>(
  effect: Effect.Effect<A, E, AgentReadinessNetwork>,
  network: AgentReadinessNetworkShape = readinessNetwork
) {
  return effect.pipe(Effect.provideService(AgentReadinessNetwork, network));
}

export async function seedReadiness(): Promise<AgentReadinessWorkflowPayload> {
  const scope = await seedProject("readiness");
  const payload = {
    ...scope,
    reportId: "report-test",
    targetUrl: "https://example.com",
  };
  await testDb
    .insert(geoAgentReadinessReports)
    .values({ id: payload.reportId, ...scope, targetUrl: payload.targetUrl });
  return payload;
}

export async function seedSuggestion(
  id = "suggestion",
  organizationId = "org-test"
) {
  await testDb.insert(geoPromptSuggestions).values({
    id,
    organizationId,
    prompt: `Which ${id} tools should I use?`,
    title: "Tools",
  });
}

export async function seedGsc() {
  await seedProject("gsc");
  const [integration] = await testDb
    .insert(googleSearchConsoleIntegrations)
    .values({
      id: "gsc-test",
      organizationId: "org-test",
      encryptedAccessToken: "test-placeholder",
      encryptedRefreshToken: "test-placeholder",
      accessTokenExpiresAt: new Date("2099-01-01"),
      siteUrl: "https://example.com",
    })
    .returning();
  if (!integration) {
    throw new Error("Failed to seed integration");
  }
  await seedSuggestion("old-pending");
  return integration;
}
