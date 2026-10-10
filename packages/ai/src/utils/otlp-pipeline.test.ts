import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { TELEMETRY_TEST_EVENT } from "@notra/ai/constants/telemetry-test";

import { createAxiomPipeline } from "./axiom-pipeline";
import { createOTLPPipeline } from "./otlp-pipeline";

test("OTLP failures, partial rejection and auth disablement remain isolated from rich Axiom shipping", async () => {
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

    status = 401;
    pipeline(context);
    await pipeline.flush();
    pipeline(context);
    await pipeline.flush();
    assert.equal(requests.length, 8);
    assert.equal(pipeline.pending, 0);

    const axiom = createAxiomPipeline({
      apiKey: "fixture",
      dataset: "fixture",
    });
    axiom(context);
    await axiom.flush();
    assert.equal(requests.length, 9);
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
