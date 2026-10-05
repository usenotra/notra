import { expect, mock, test } from "bun:test";

import { sendRequestLog } from "../src/send";

test.each([400, 401, 403, 429, 502, 503])(
  "reports HTTP %i through onError without exposing response data or retrying",
  async (status) => {
    const onError = mock();
    const send = mock(
      async () => new Response("fixture-private-response-body", { status })
    );
    await sendRequestLog(
      { method: "GET", url: "https://example.com/" },
      {
        token: "fixture-private-token",
        endpoint: "https://ingest.example/",
        fetch: send,
        onError,
      }
    );
    expect(send).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    const error = onError.mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(`GEO ingest request failed (HTTP ${status})`);
    expect(error.message).not.toContain("fixture-private");
  }
);

test.each([200, 202, 204])("HTTP %i remains successful", async (status) => {
  const onError = mock();
  await sendRequestLog(
    { method: "GET", url: "https://example.com/" },
    {
      token: "fixture",
      fetch: async () => new Response(null, { status }),
      onError,
    }
  );
  expect(onError).not.toHaveBeenCalled();
});

test("HTTP failures remain non-throwing when onError throws or is absent", async () => {
  for (const onError of [
    undefined,
    () => {
      throw new Error("callback failure");
    },
  ]) {
    await expect(
      sendRequestLog(
        { method: "GET", url: "https://example.com/" },
        {
          token: "fixture",
          fetch: async () => new Response(null, { status: 502 }),
          onError,
        }
      )
    ).resolves.toBeUndefined();
  }
});

test("network failures still report the original error without retrying", async () => {
  const error = new Error("fixture network failure");
  const onError = mock();
  const send = mock(async () => {
    throw error;
  });
  await sendRequestLog(
    { method: "GET", url: "https://example.com/" },
    { token: "fixture", fetch: send, onError }
  );
  expect(onError).toHaveBeenCalledWith(error);
  expect(send).toHaveBeenCalledTimes(1);
});

test("failure response bodies are canceled and their cancellation errors do not hide HTTP status", async () => {
  const cancel = mock(() => {
    throw new Error("fixture cancellation failure");
  });
  const onError = mock();
  const body = new ReadableStream({ cancel });
  await sendRequestLog(
    { method: "GET", url: "https://example.com/" },
    {
      token: "fixture",
      fetch: async () => new Response(body, { status: 429 }),
      onError,
    }
  );
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(onError.mock.calls[0]?.[0]?.message).toBe(
    "GEO ingest request failed (HTTP 429)"
  );
});

test("HTTP error reporting does not wait for pending body cancellation", async () => {
  let releaseCancellation: () => void = () => undefined;
  let markCancellationStarted: () => void = () => undefined;
  const cancellation = new Promise<void>((resolve) => {
    releaseCancellation = resolve;
  });
  const started = new Promise<void>((resolve) => {
    markCancellationStarted = resolve;
  });
  const cancel = mock(() => {
    markCancellationStarted();
    return cancellation;
  });
  const onError = mock();
  const sending = sendRequestLog(
    { method: "GET", url: "https://example.com/" },
    {
      token: "fixture",
      fetch: async () =>
        new Response(new ReadableStream({ cancel }), { status: 502 }),
      onError,
    }
  );
  try {
    await started;
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]?.message).toBe(
      "GEO ingest request failed (HTTP 502)"
    );
    await expect(sending).resolves.toBeUndefined();
  } finally {
    releaseCancellation();
    await sending;
  }
});
