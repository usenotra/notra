import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { runWithOperationalContext } from "../utils/operational-context";
import {
  callOptions,
  createFakeAdapter,
  createTestRouter,
  httpError,
  readStreamParts,
} from "./test-helpers";

describe("gateway request attribution", () => {
  test("attributes parallel background calls without mixing scan context", async () => {
    const { router, vercel, logger } = createTestRouter();
    await Promise.all(
      ["best-tools", "alternatives"].map((promptId) =>
        router
          .model("anthropic/claude-opus-5.5", {
            organizationId: "org-test",
            gateway: "vercel",
            logContext: {
              projectId: "project-test",
              scanId: "scan-test",
              runId: "run-test",
              promptId,
            },
          })
          .doGenerate(callOptions({ gateway: { tags: ["geo-scan-grounded"] } }))
      )
    );

    const completed = logger.entries.filter(
      (entry) => entry.event === "ai.call.completed"
    );
    assert.equal(completed.length, 2);
    assert.deepEqual(completed.map((entry) => entry.fields?.promptId).sort(), [
      "alternatives",
      "best-tools",
    ]);
    for (const entry of completed) {
      assert.equal(entry.fields?.organizationId, "org-test");
      assert.equal(entry.fields?.projectId, "project-test");
      assert.equal(entry.fields?.scanId, "scan-test");
      assert.equal(entry.fields?.runId, "run-test");
      assert.equal(entry.fields?.generationId, "gen_test");
      assert.deepEqual(entry.fields?.tags, ["geo-scan-grounded"]);
      const started = logger.entries.find(
        (candidate) =>
          candidate.event === "ai.call.started" &&
          candidate.fields?.callId === entry.fields?.callId
      );
      assert.ok(entry.fields?.requestId);
      assert.equal(started?.fields?.requestId, entry.fields?.requestId);
    }
    for (const call of vercel?.calls ?? []) {
      assert.equal(call.options.providerOptions?.gateway?.user, "org-test");
      assert.deepEqual(call.options.providerOptions?.gateway?.tags, [
        "geo-scan-grounded",
      ]);
    }
  });

  test("preserves the HTTP request ID and an explicit gateway user", async () => {
    const { router, vercel, logger } = createTestRouter();
    await runWithOperationalContext({ requestId: "http-request" }, () =>
      router
        .model("openai/gpt-6-sol", {
          organizationId: "org-test",
          gateway: "vercel",
        })
        .doGenerate(callOptions({ gateway: { user: "explicit-user" } }))
    );
    assert.equal(
      vercel?.calls[0]?.options.providerOptions?.gateway?.user,
      "explicit-user"
    );
    assert.equal(
      logger.entries.find((entry) => entry.event === "ai.call.completed")
        ?.fields?.requestId,
      "http-request"
    );
  });

  test("does not invent a gateway user for organization-free calls", async () => {
    const { router, vercel } = createTestRouter();
    await router
      .model("openai/gpt-6-sol", { gateway: "vercel" })
      .doGenerate(callOptions());
    assert.equal(
      vercel?.calls[0]?.options.providerOptions?.gateway?.user,
      undefined
    );
  });

  test("keeps organization attribution when falling back to Vercel", async () => {
    const { router, vercel } = createTestRouter({
      openrouter: createFakeAdapter({
        id: "openrouter",
        onCall: () => {
          throw httpError(503);
        },
      }),
    });
    await router
      .model("openai/gpt-6-sol", { organizationId: "org-test" })
      .doGenerate(callOptions());
    assert.equal(
      vercel?.calls[0]?.options.providerOptions?.gateway?.user,
      "org-test"
    );
  });

  test("records the generation ID for streaming calls", async () => {
    const { router, logger } = createTestRouter();
    await readStreamParts(
      await router
        .model("openai/gpt-6-sol", {
          organizationId: "org-test",
          gateway: "vercel",
          logContext: { scanId: "stream-scan" },
        })
        .doStream(callOptions())
    );
    const completed = logger.entries.find(
      (entry) => entry.event === "ai.call.completed"
    );
    assert.equal(completed?.fields?.generationId, "gen_test");
    assert.equal(completed?.fields?.scanId, "stream-scan");
  });
});
