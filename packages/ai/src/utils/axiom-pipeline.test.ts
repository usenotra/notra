import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test";

import type { DrainContext } from "evlog";

import { createAxiomPipeline } from "./axiom-pipeline";

const PERMANENT_STATUS = 403;
const TRANSIENT_STATUS = 500;
const MAX_ATTEMPTS = 3;

let responseStatus = PERMANENT_STATUS;
let requestCount = 0;

const fetchMock = spyOn(globalThis, "fetch").mockImplementation(async () => {
  requestCount += 1;
  return new Response('{"message":"rejected"}', { status: responseStatus });
});

const warn = spyOn(console, "warn").mockImplementation(() => undefined);
const error = spyOn(console, "error").mockImplementation(() => undefined);

afterAll(() => {
  fetchMock.mockRestore();
  warn.mockRestore();
  error.mockRestore();
});

beforeEach(() => {
  requestCount = 0;
  warn.mockClear();
  error.mockClear();
});

function createTestPipeline() {
  return createAxiomPipeline(
    { apiKey: "test", baseUrl: "https://axiom.test", dataset: "test" },
    {
      batch: { size: 1, intervalMs: 10 },
      retry: { maxAttempts: MAX_ATTEMPTS, initialDelayMs: 1, maxDelayMs: 1 },
      maxBufferSize: 100,
    }
  );
}

function event(index: number) {
  return {
    event: { message: `event ${index}`, timestamp: new Date().toISOString() },
  } as unknown as DrainContext;
}

describe("Axiom pipeline", () => {
  test("stops shipping after a permanent rejection", async () => {
    responseStatus = PERMANENT_STATUS;
    const drain = createTestPipeline();

    for (const index of [1, 2, 3]) {
      drain(event(index));
    }
    await drain.flush();
    const requestsAfterRejection = requestCount;

    drain(event(4));
    await drain.flush();

    expect(requestsAfterRejection).toBeLessThanOrEqual(3);
    expect(requestCount).toBe(requestsAfterRejection);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });

  test("keeps retrying transient errors and still settles flush", async () => {
    responseStatus = TRANSIENT_STATUS;
    const drain = createTestPipeline();

    drain(event(1));
    await drain.flush();
    drain(event(2));
    await drain.flush();

    expect(requestCount).toBe(2 * MAX_ATTEMPTS);
    expect(warn).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(2);
  });
});
