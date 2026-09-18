import { describe, expect, mock, test } from "bun:test";

import { FEEDBACK_ORGANIZATION_NOT_FOUND_ERROR } from "../src/constants/feedback";
import type { AuthData } from "../src/types/auth";
import { createOpenApiApp } from "../src/utils/openapi-app";

mock.module("../src/utils/ratelimit", () => ({
  enforceRatelimit: mock(async () => null),
  enforceRatelimitForKey: mock(async () => null),
  RATE_LIMITS: {
    feedbackIngest: { requests: 120, window: "1 minute" },
    feedbackIngestIp: { requests: 60, window: "1 minute" },
    feedbackIngestOrganization: { requests: 30, window: "1 minute" },
  },
  ratelimit: {
    feedbackIngest: {},
    feedbackIngestIp: {},
    feedbackIngestOrganization: {},
  },
}));

const { feedbackRoutes } = await import("../src/routes/feedback");

function createFeedbackApp(db: unknown, auth?: AuthData) {
  const app = createOpenApiApp();
  app.use("*", async (c, next) => {
    if (auth) {
      c.set("auth", auth);
    }
    c.set("db", db);
    await next();
  });
  app.route("/", feedbackRoutes);
  return app;
}

describe("feedback routes", () => {
  test("public slug ingest returns 404 when the organization does not exist", async () => {
    const db = {
      query: {
        organizations: {
          findFirst: mock(async () => undefined),
        },
      },
    };

    const response = await createFeedbackApp(db).request(
      "/feedback/unknown-workspace",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: "Something broke",
          kind: "bug",
          sentiment: "negative",
          title: "Bug report",
        }),
      }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: FEEDBACK_ORGANIZATION_NOT_FOUND_ERROR,
    });
  });
});
