import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";

import { createTimeoutFetch } from "./timeout-fetch";

const OK_URL = "https://example.com/ok";

function waitForAbort(signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

function mockFetch(): { getSignal: () => AbortSignal | null | undefined } {
  let passedSignal: AbortSignal | null | undefined;

  globalThis.fetch = mock((_input: RequestInfo | URL, init?: RequestInit) => {
    passedSignal = init?.signal;
    return Promise.resolve(new Response("ok"));
  }) as typeof fetch;

  return {
    getSignal: () => passedSignal,
  };
}

describe("createTimeoutFetch", () => {
  const originalFetch = globalThis.fetch;
  const restorers: Array<() => void> = [];

  afterEach(() => {
    for (const restore of restorers.splice(0)) {
      restore();
    }
    globalThis.fetch = originalFetch;
  });

  test("attaches a timeout signal with the given deadline", async () => {
    const timeoutSpy = spyOn(AbortSignal, "timeout");
    restorers.push(() => timeoutSpy.mockRestore());
    const fetchMock = mockFetch();

    await createTimeoutFetch(1500)(OK_URL);

    expect(timeoutSpy).toHaveBeenCalledWith(1500);
    expect(fetchMock.getSignal()).toBeInstanceOf(AbortSignal);
    expect(fetchMock.getSignal()?.aborted).toBe(false);
  });

  test("combines an explicit caller signal with the timeout", async () => {
    const anySpy = spyOn(AbortSignal, "any");
    restorers.push(() => anySpy.mockRestore());
    const controller = new AbortController();
    const fetchMock = mockFetch();

    await createTimeoutFetch(60_000)(OK_URL, { signal: controller.signal });

    expect(anySpy).toHaveBeenCalled();
    controller.abort("caller");
    expect(fetchMock.getSignal()?.aborted).toBe(true);
  });

  test("inherits Request.signal when init.signal is omitted", async () => {
    const anySpy = spyOn(AbortSignal, "any");
    restorers.push(() => anySpy.mockRestore());
    const controller = new AbortController();
    const request = new Request(OK_URL, { signal: controller.signal });
    const fetchMock = mockFetch();

    await createTimeoutFetch(60_000)(request);

    expect(anySpy).toHaveBeenCalled();
    controller.abort("request");
    expect(fetchMock.getSignal()?.aborted).toBe(true);
  });

  test("inherits Request.signal when init.signal is undefined", async () => {
    const anySpy = spyOn(AbortSignal, "any");
    restorers.push(() => anySpy.mockRestore());
    const controller = new AbortController();
    const request = new Request(OK_URL, { signal: controller.signal });
    const fetchMock = mockFetch();

    await createTimeoutFetch(60_000)(request, { signal: undefined });

    expect(anySpy).toHaveBeenCalled();
    controller.abort("request");
    expect(fetchMock.getSignal()?.aborted).toBe(true);
  });

  test("does not inherit Request.signal when init.signal is null", async () => {
    const anySpy = spyOn(AbortSignal, "any");
    restorers.push(() => anySpy.mockRestore());
    const controller = new AbortController();
    const request = new Request(OK_URL, { signal: controller.signal });
    const fetchMock = mockFetch();

    await createTimeoutFetch(60_000)(request, { signal: null });

    expect(anySpy).not.toHaveBeenCalled();
    expect(fetchMock.getSignal()).toBeInstanceOf(AbortSignal);
    controller.abort("request");
    expect(fetchMock.getSignal()?.aborted).toBe(false);
  });

  test("aborts when the deadline elapses", async () => {
    const fetchMock = mockFetch();

    await createTimeoutFetch(10)(OK_URL);

    const passedSignal = fetchMock.getSignal();
    expect(passedSignal).toBeDefined();
    await waitForAbort(passedSignal as AbortSignal);
    expect(passedSignal?.aborted).toBe(true);
  });
});
