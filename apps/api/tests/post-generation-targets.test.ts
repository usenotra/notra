import { describe, expect, mock, test } from "bun:test";

import { postsRoutes } from "../src/routes/posts";
import type { AuthData } from "../src/types/auth";
import { createOpenApiApp } from "../src/utils/openapi-app";

const DB_FAILURE_MESSAGE = "connect ECONNREFUSED 10.0.0.5:5432";

const runtimeEnv = {
  WORKFLOW_BASE_URL: "https://dashboard.example.test",
  UPSTASH_REDIS_REST_URL: "https://redis.example.test",
  UPSTASH_REDIS_REST_TOKEN: "token",
};

function selectResult(result: () => Promise<unknown>) {
  const builder = {
    select: () => builder,
    from: () => builder,
    where: () => result(),
  };
  return builder;
}

function createApp(githubIntegrationRows: () => Promise<unknown>) {
  const db = {
    ...selectResult(githubIntegrationRows),
    query: {
      organizations: {
        findFirst: mock(async () => ({
          id: "org_test",
          slug: "org",
          name: "Org",
          logo: null,
        })),
      },
    },
  };
  const app = createOpenApiApp();
  app.use("*", async (c, next) => {
    c.set("auth", {
      identity: { externalId: "org_test" },
    } as unknown as AuthData);
    c.set("db", db as never);
    await next();
  });
  app.route("/", postsRoutes);
  return app;
}

function requestGeneration(app: ReturnType<typeof createApp>) {
  return app.request(
    "/posts/generate",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contentType: "changelog",
        integrations: { github: ["repo_connected", "repo_missing"] },
      }),
    },
    runtimeEnv
  );
}

describe("POST /posts/generate", () => {
  test("a database failure is a 500, not a 400 with the driver message", async () => {
    const app = createApp(async () => {
      throw new Error(DB_FAILURE_MESSAGE);
    });

    const response = await requestGeneration(app);

    expect(response.status).toBe(500);
  });
});
