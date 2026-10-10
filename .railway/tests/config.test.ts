import { expect, test } from "bun:test";

import { createRailwayContext, project } from "railway/iac";

import aiTraffic, { partial } from "../ai-traffic.ts";
import demo from "../demo.ts";

test("demo reuses only the existing API and dashboard", async () => {
  const definition = await demo(
    createRailwayContext({
      projectName: "notra-demo",
      environment: "production",
    }),
    project
  );
  const resources = definition.resources?.flat() ?? [];

  expect(definition.name).toBe("notra-demo");
  expect(resources.map((resource) => resource.address)).toEqual([
    "service.demo-api",
    "service.dashboard",
  ]);
  expect(resources).toMatchObject([
    {
      source: { rootDirectory: "/" },
      build: { dockerfilePath: "apps/api/Dockerfile" },
      deploy: {
        multiRegionConfig: { "us-east4-eqdc4a": { numReplicas: 1 } },
      },
      networking: { customDomains: { "demo-api.usenotra.com": {} } },
    },
    {
      build: { dockerfilePath: "apps/dashboard/Dockerfile" },
      deploy: {
        healthcheckPath: "/api/healthcheck",
        healthcheckTimeout: 300,
        multiRegionConfig: { "us-east4-eqdc4a": { numReplicas: 1 } },
        preDeployCommand: [
          "sh -c 'if [ -x /migrate/run.sh ]; then /migrate/run.sh; else cd /app && DATABASE_URL=$MIGRATION_DATABASE_URL bun run db:migrate; fi'",
        ],
      },
      networking: { customDomains: { "demo.usenotra.com": {} } },
      variables: { MIGRATION_DATABASE_URL: { type: "preserve" } },
    },
  ]);
});

test("AI traffic owns only ingest and retains its two replicas", async () => {
  const definition = await aiTraffic(
    createRailwayContext({
      projectName: "notra-prod",
      environment: "production",
    }),
    project
  );
  const resources = definition.resources?.flat() ?? [];

  expect(partial).toBe("ai-traffic");
  expect(definition.name).toBe("notra-prod");
  expect(resources.map((resource) => resource.address)).toEqual([
    "service.ai-traffic-ingest",
  ]);
  expect(resources).toMatchObject([
    {
      source: { rootDirectory: "/" },
      build: { dockerfilePath: "apps/ai-traffic-ingest/Dockerfile" },
      deploy: {
        healthcheckPath: "/readyz",
        healthcheckTimeout: 60,
        multiRegionConfig: { "us-east4-eqdc4a": { numReplicas: 2 } },
        drainingSeconds: 60,
        restartPolicyMaxRetries: 5,
      },
      networking: {
        customDomains: { "ingest.usenotra.com": { port: 3000 } },
      },
      variables: {
        TINYBIRD_BASE_URL: { type: "preserve" },
        TINYBIRD_TOKEN: { type: "preserve" },
      },
    },
  ]);
});

test.each([
  { name: "demo", program: demo, projectName: "notra-demo" },
  { name: "AI traffic", program: aiTraffic, projectName: "notra-prod" },
])(
  "$name preserves variables and does not restore autodeploys",
  async ({ program, projectName }) => {
    const definition = await program(
      createRailwayContext({ projectName, environment: "production" }),
      project
    );

    for (const resource of definition.resources?.flat() ?? []) {
      expect(resource.type).toBe("service");
      if (resource.type === "service") {
        expect(resource.source).toMatchObject({
          type: "github",
          repo: "usenotra/notra",
        });
        expect(resource.source?.branch).toBeUndefined();
        expect(resource.build?.watchPatterns).toBeUndefined();
        expect(resource.configFile).toBeUndefined();
        expect(resource.variables).toMatchObject({
          DATABASE_URL: { type: "preserve" },
          GEO_INGEST_SECRET: { type: "preserve" },
          UPSTASH_REDIS_REST_TOKEN: { type: "preserve" },
          UPSTASH_REDIS_REST_URL: { type: "preserve" },
        });
        for (const variable of Object.values(resource.variables ?? {})) {
          expect(variable).toEqual({ type: "preserve" });
        }
      }
    }
  }
);

test.each([
  { name: "demo", program: demo, projectName: "notra-demo" },
  { name: "AI traffic", program: aiTraffic, projectName: "notra-prod" },
])(
  "$name rejects missing or incorrect Railway context",
  ({ program, projectName }) => {
    for (const context of [
      {},
      { projectName, environment: "staging" },
      { projectName: "another-project", environment: "production" },
    ]) {
      expect(() => program(createRailwayContext(context), project)).toThrow(
        "requires"
      );
    }
  }
);
