import assert from "node:assert/strict";
import { test } from "node:test";

import type { McpToolTelemetryEvent } from "@notra/ai/types/mcp-telemetry";

import { observeMcpTool } from "./observe-mcp-tool";

test("MCP outcomes emit once without leaking content or changing results and errors", async () => {
  const fields = {
    organizationId: "org_fixture",
    integrationId: "mcp_fixture",
    toolId: "tool_fixture",
    surface: "chat",
  };
  const events: McpToolTelemetryEvent[] = [];
  const options = {
    emit: (event: McpToolTelemetryEvent) => events.push(event),
  };
  const success = { content: [{ text: "private output" }] };
  const toolError = { ...success, isError: true };
  assert.equal(
    await observeMcpTool(fields, async () => success, options),
    success
  );
  assert.equal(
    await observeMcpTool(fields, async () => toolError, options),
    toolError
  );
  const failure = new DOMException("private error", "AbortError");
  await assert.rejects(
    observeMcpTool(
      fields,
      async () => {
        throw failure;
      },
      options
    ),
    (error) => error === failure
  );
  assert.deepEqual(
    events.map((event) => event.outcome),
    ["success", "error", "cancelled"]
  );
  assert.equal(events[1]?.errorKind, "tool_error");
  assert.doesNotMatch(JSON.stringify(events), /private|content/);
});
