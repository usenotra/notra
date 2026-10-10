import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { TELEMETRY_TEST_EVENT } from "@notra/ai/constants/telemetry-test";

import { createAxiomPipeline } from "./axiom-pipeline";
import { createOTLPPipeline } from "./otlp-pipeline";
import { isRecord } from "./unknown-record";

test("OTLP failures, resource grouping and permanent disablement remain isolated from rich Axiom shipping", async () => {
  const keys = ["NOTRA_OTLP_ENDPOINT", "NOTRA_OTLP_TOKEN"];
  const previous = keys.map((key) => process.env[key]);
  const requests: Request[] = [];
  const diagnostics: unknown[][] = [];
  let status = 503;
  const warn = mock.method(console, "warn", (...args: unknown[]) =>
    diagnostics.push(args)
  );
  const error = mock.method(console, "error", (...args: unknown[]) =>
    diagnostics.push(args)
  );
  const fetchMock = mock.method(
    globalThis,
    "fetch",
    (...[input, init]: Parameters<typeof fetch>) => {
      const request = new Request(input, init);
      requests.push(request);
      if (request.url.includes("axiom.co")) {
        return Promise.resolve(Response.json({}));
      }
      return Promise.resolve(
        status === 200
          ? Response.json({
              partialSuccess: {
                rejectedLogRecords: "1",
                errorMessage: "private response",
              },
            })
          : new Response("OTLP API error: 401 private response", {
              status,
              headers: { Location: "https://untrusted.example.test" },
            })
      );
    }
  );
  try {
    process.env.NOTRA_OTLP_ENDPOINT = "https://telemetry.example.test";
    process.env.NOTRA_OTLP_TOKEN = "fixture";
    const pipeline = createOTLPPipeline();
    assert.ok(pipeline);
    const context = {
      event: {
        ...TELEMETRY_TEST_EVENT,
        organizationId: "org_fixture",
        prompt: "private prompt",
      },
    };

    pipeline(context);
    await pipeline.flush();
    assert.equal(requests.length, 3);
    assert.equal(pipeline.pending, 0);

    status = 307;
    pipeline(context);
    await pipeline.flush();
    assert.equal(requests.length, 6);
    assert.ok(
      requests.slice(3).every((request) => request.redirect === "error")
    );

    status = 200;
    pipeline(context);
    await pipeline.flush();
    await pipeline.flush();
    assert.equal(requests.length, 7);
    const partialRequest = requests.at(-1);
    assert.ok(partialRequest);
    assert.equal(partialRequest.headers.get("authorization"), "Bearer fixture");
    assert.doesNotMatch(await partialRequest.text(), /private/);
    assert.ok(
      diagnostics.some(
        (entry) => entry[0] === "[otlp] 1 event(s) rejected by collector"
      )
    );

    for (const [version, region] of [
      ["v1", "iad1"],
      ["v1", "sfo1"],
      ["v2", "iad1"],
      ["v2", "sfo1"],
      ["v1", "iad1"],
    ]) {
      pipeline({ event: { ...context.event, version, region } });
    }
    await pipeline.flush();
    const groupedRequest = requests.at(-1);
    assert.ok(groupedRequest);
    const payload: unknown = await groupedRequest.json();
    assert.ok(isRecord(payload) && Array.isArray(payload.resourceLogs));
    const groups = new Set();
    for (const group of payload.resourceLogs) {
      assert.ok(
        isRecord(group) &&
          isRecord(group.resource) &&
          Array.isArray(group.resource.attributes)
      );
      const attributes = new Map<string, unknown>();
      for (const attribute of group.resource.attributes) {
        assert.ok(isRecord(attribute) && isRecord(attribute.value));
        attributes.set(String(attribute.key), attribute.value.stringValue);
      }
      assert.ok(Array.isArray(group.scopeLogs));
      const records = group.scopeLogs[0]?.logRecords;
      assert.ok(Array.isArray(records));
      groups.add(
        `${attributes.get("service.version")}:${attributes.get("cloud.region")}:${records.length}`
      );
    }
    assert.deepEqual(
      groups,
      new Set(["v1:iad1:2", "v1:sfo1:1", "v2:iad1:1", "v2:sfo1:1"])
    );
    for (const permanentStatus of [401, 403, 404]) {
      status = permanentStatus;
      const disabled = createOTLPPipeline();
      assert.ok(disabled);
      const before: number = requests.length;
      disabled(context);
      await disabled.flush();
      disabled(context);
      await disabled.flush();
      assert.equal(requests.length, before + 1);
      assert.equal(disabled.pending, 0);
    }

    const axiom = createAxiomPipeline({
      apiKey: "fixture",
      dataset: "fixture",
    });
    const beforeAxiom = requests.length;
    axiom(context);
    await axiom.flush();
    assert.equal(requests.length, beforeAxiom + 1);
    const axiomRequest = requests.at(-1);
    assert.ok(axiomRequest);
    assert.match(await axiomRequest.text(), /private prompt/);
    assert.doesNotMatch(JSON.stringify(diagnostics), /private/);

    process.env.NOTRA_OTLP_ENDPOINT = "http://public.example.test";
    assert.equal(createOTLPPipeline(), undefined);
  } finally {
    fetchMock.mock.restore();
    warn.mock.restore();
    error.mock.restore();
    for (const [index, key] of keys.entries()) {
      if (previous[index] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[index];
      }
    }
  }
});
