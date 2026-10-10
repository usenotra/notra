import assert from "node:assert/strict";
import { test } from "node:test";

import { TELEMETRY_IDENTIFIER_FIELDS } from "@notra/ai/constants/telemetry";
import { TELEMETRY_TEST_EVENT } from "@notra/ai/constants/telemetry-test";

import { telemetryEvent } from "./telemetry-event";
import { telemetryValue } from "./telemetry-value";

test("projection preserves reviewed routes, providers and GEO codes without private content", () => {
  const event = {
    ...TELEMETRY_TEST_EVENT,
    event: "geo.ingest",
    routeId: "/api/organizations/$organizationId/chat/$chatId/stream",
    provider: "context.dev",
    upstreamProvider: "Amazon Bedrock",
    organizationId: "org_fixture",
    reason: "visitor_type",
    prompt: "private prompt",
    requestId: "private@example.test",
    headers: { authorization: "private credential" },
    ai: {
      outputTokens: 0,
      inputTokens: -1,
      costUsd: Infinity,
      response: "private output",
    },
  };
  const original = structuredClone(event);
  const safe = telemetryEvent(event);
  assert.equal(safe.routeId, event.routeId);
  assert.equal(safe.provider, "context.dev");
  assert.equal(safe.upstreamProvider, "amazon-bedrock");
  assert.equal(safe.reason, "visitor_type");
  assert.equal(safe.organizationId, "org_fixture");
  assert.deepEqual(safe.ai, { outputTokens: 0 });
  assert.doesNotMatch(JSON.stringify(safe), /private|prompt|headers|response/);
  assert.deepEqual(event, original);

  for (const routeId of [
    "/api/:organizationId",
    "/rpc/[[...rest]]",
    "/.well-known/oauth-authorization-server",
    "unmatched",
  ]) {
    assert.equal(telemetryEvent({ ...event, routeId }).routeId, routeId);
  }
  for (const value of [
    "https://example.test/private/path",
    "//example.test/path",
    "Bearer sk_private",
    "private@example.test",
  ]) {
    const rejected = telemetryEvent({
      ...event,
      routeId: value,
      feature: value,
      provider: value,
      upstreamProvider: value,
    });
    assert.equal(rejected.routeId, undefined);
    assert.equal(rejected.feature, undefined);
    assert.equal(rejected.provider, undefined);
    assert.equal(rejected.upstreamProvider, undefined);
  }
  assert.equal(
    telemetryEvent({ ...event, reason: "private reason" }).reason,
    undefined
  );
  assert.equal(
    telemetryEvent({ ...event, event: "other.event" }).reason,
    undefined
  );
  const runtime = telemetryEvent({
    ...event,
    event: "geo.ingest.runtime",
    rssBytes: 0,
    activeRequests: 0.5,
    heapUsedBytes: -1,
  });
  assert.equal(runtime.rssBytes, 0);
  assert.equal(runtime.activeRequests, undefined);
  assert.equal(runtime.heapUsedBytes, undefined);
  assert.equal(telemetryEvent({ ...event, rssBytes: 1 }).rssBytes, undefined);
  assert.equal(telemetryValue("constructor", "code"), false);
});

test("JWT-shaped identifiers are stripped while reviewed model namespaces survive", () => {
  for (const value of [
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmaXh0dXJlIn0.fixture",
    "header.payload.",
  ]) {
    for (const key of TELEMETRY_IDENTIFIER_FIELDS) {
      assert.equal(telemetryValue(key, value), false);
      assert.equal(
        telemetryEvent({ ...TELEMETRY_TEST_EVENT, [key]: value })[key],
        undefined
      );
    }
  }
  assert.equal(telemetryValue("requestId", "request_fixture.123"), true);
  for (const model of [
    "meta/llama-4-maverick",
    "spacexai/grok-4.7",
    "vercel/anthropic/claude-opus-5.5",
    "vercel/openai/gpt-6-luna",
  ]) {
    const event = telemetryEvent({
      ...TELEMETRY_TEST_EVENT,
      model,
      requestedModel: model,
      ai: { model },
    });
    assert.equal(event.model, model);
    assert.equal(event.requestedModel, model);
    assert.deepEqual(event.ai, { model });
  }
  for (const model of [
    "vercel/arbitrary/claude-opus-5",
    "vercel/vercel/openai/gpt-6",
    "meta/private-text",
    "vercel/openai/gpt-secret_fixture",
  ]) {
    assert.equal(telemetryValue("model", model), false);
  }
});
