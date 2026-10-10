import assert from "node:assert/strict";
import { test } from "node:test";

import type { WideEvent } from "evlog";

import {
  evlogRequestIntegration,
  trackRequestLoggerEmit,
} from "./evlog-request";
import { httpErrorKind } from "./http-error-kind";

test("final request outcome follows body failures without changing the sent status or lazy attribution", async () => {
  for (const status of [200, 403]) {
    const events: WideEvent[] = [];
    const request = evlogRequestIntegration.start(undefined, {
      drain: ({ event }) => {
        events.push(event);
      },
    });
    trackRequestLoggerEmit(request.logger);
    request.logger.set({
      event: "api.request.completed",
      outcome: status >= 400 ? "error" : "success",
      errorKind: httpErrorKind(status),
      organizationId: "org_stale",
    });
    if (status === 403) {
      request.logger.setLevel("warn");
    }
    let authorizedOrganization: string | undefined;
    const emit = request.logger.emit.bind(request.logger);
    request.logger.emit = (overrides) =>
      emit({ ...overrides, organizationId: authorizedOrganization });
    let reads = 0;
    const response = await request.finishResponse(
      new Response(
        new ReadableStream({
          pull(controller) {
            if (reads++ === 0) {
              controller.enqueue(new TextEncoder().encode("partial"));
            } else {
              authorizedOrganization = "org_verified";
              controller.error(new Error("fixture body failure"));
            }
          },
        }),
        { status, headers: { "content-type": "text/event-stream" } }
      )
    );
    assert.equal(response.status, status);
    assert.equal(events.length, 0);
    await assert.rejects(response.text(), /fixture body failure/);
    assert.equal(events.length, 1);
    assert.equal(events[0]?.status, 500);
    assert.equal(events[0]?.outcome, "error");
    assert.equal(events[0]?.errorKind, "server_error");
    assert.equal(events[0]?.level, "error");
    assert.equal(events[0]?.organizationId, "org_verified");
  }
});

test("normal final requests preserve client-error levels and clear stale error kinds", async () => {
  for (const status of [200, 403]) {
    const events: WideEvent[] = [];
    const request = evlogRequestIntegration.start(undefined, {
      drain: ({ event }) => {
        events.push(event);
      },
    });
    trackRequestLoggerEmit(request.logger);
    request.logger.set({ outcome: "error", errorKind: "server_error" });
    if (status === 403) {
      request.logger.setLevel("warn");
    }
    const response = await request.finishResponse(
      new Response(null, { status })
    );
    assert.equal(response.status, status);
    assert.equal(events.length, 1);
    assert.equal(events[0]?.outcome, status >= 400 ? "error" : "success");
    assert.equal(events[0]?.errorKind, httpErrorKind(status));
    assert.equal(events[0]?.level, status === 403 ? "warn" : "info");
  }
});
