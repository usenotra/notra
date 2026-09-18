import {
  afterAll,
  afterEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";

import { createGeoMiddleware } from "../src/astro";
import { Tracker } from "../src/tracker";

const send = spyOn(globalThis, "fetch");

afterAll(() => {
  send.mockRestore();
});

afterEach(() => {
  send.mockReset();
});

describe("Astro middleware", () => {
  test("sends the request envelope and preserves the downstream response", async () => {
    send.mockResolvedValue(new Response(null, { status: 204 }));
    const request = new Request(
      "https://example.com/docs?utm_source=chatgpt.com",
      {
        headers: { "user-agent": "GPTBot", referer: "https://chatgpt.com/" },
      }
    );
    const response = new Response("page");
    const next = mock(async () => response);
    const middleware = createGeoMiddleware({ token: "test-token" });

    expect(await middleware({ request }, next)).toBe(response);
    expect(next).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
    const [url, init] = send.mock.calls[0] ?? [];
    expect(url).toBe("https://app.usenotra.com/api/geo/ingest");
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer test-token"
    );
    expect(JSON.parse(String(init?.body))).toMatchObject({
      url: request.url,
      method: "GET",
      userAgent: "GPTBot",
      referer: "https://chatgpt.com/",
    });
  });

  test("accepts a synchronous next result", async () => {
    const response = new Response("page");
    expect(
      await createGeoMiddleware({ token: "" })(
        { request: new Request("https://example.com/") },
        () => response
      )
    ).toBe(response);
  });

  test("runs the handler while sending and waits for capture before returning", async () => {
    const sent = Promise.withResolvers<Response>();
    send.mockReturnValue(sent.promise);
    const next = mock(async () => new Response("page"));
    let completed = false;
    const pending = createGeoMiddleware({ token: "test-token" })(
      { request: new Request("https://example.com/") },
      next
    ).then((result) => {
      completed = true;
      return result;
    });

    await Promise.resolve();
    expect(next).toHaveBeenCalledTimes(1);
    expect(completed).toBe(false);
    sent.resolve(new Response(null, { status: 204 }));
    expect(await (await pending).text()).toBe("page");
  });

  test("keeps serving the page if ingest fails", async () => {
    const error = new Error("network unavailable");
    send.mockRejectedValue(error);
    const onError = mock();
    const response = new Response("page");
    const result = await createGeoMiddleware({ token: "test-token", onError })(
      { request: new Request("https://example.com/") },
      async () => response
    );
    expect(result).toBe(response);
    expect(onError).toHaveBeenCalledWith(error);
  });

  test("keeps serving the page if onError throws", async () => {
    send.mockRejectedValue(new Error("network unavailable"));
    const response = new Response("page");
    const result = await createGeoMiddleware({
      token: "test-token",
      onError: () => {
        throw new Error("callback failed");
      },
    })({ request: new Request("https://example.com/") }, async () => response);
    expect(result).toBe(response);
  });

  test("keeps serving the page if tracking rejects", async () => {
    const track = spyOn(Tracker.prototype, "track").mockRejectedValue(
      new Error("capture failed")
    );
    const response = new Response("page");
    try {
      expect(
        await createGeoMiddleware({ token: "test-token" })(
          { request: new Request("https://example.com/") },
          async () => response
        )
      ).toBe(response);
    } finally {
      track.mockRestore();
    }
  });

  test("preserves downstream errors if tracking rejects", async () => {
    const track = spyOn(Tracker.prototype, "track").mockRejectedValue(
      new Error("capture failed")
    );
    const error = new Error("route failed");
    try {
      await expect(
        createGeoMiddleware({ token: "test-token" })(
          { request: new Request("https://example.com/") },
          () => Promise.reject(error)
        )
      ).rejects.toBe(error);
    } finally {
      track.mockRestore();
    }
  });

  test("preserves downstream errors and still finishes tracking", async () => {
    const sent = Promise.withResolvers<Response>();
    send.mockReturnValue(sent.promise);
    const error = new Error("route failed");
    const pending = createGeoMiddleware({ token: "test-token" })(
      { request: new Request("https://example.com/") },
      () => Promise.reject(error)
    );
    sent.resolve(new Response(null, { status: 204 }));
    await expect(pending).rejects.toBe(error);
    expect(send).toHaveBeenCalledTimes(1);
  });

  test.each([
    { token: "", path: "/docs" },
    { token: "test-token", path: "/api/private" },
    { token: "test-token", path: "/_astro/index.js" },
    { token: "test-token", path: "/docs", sample: 0 },
    { token: "test-token", path: "/private", exclude: ["/private"] },
  ])("skips ineligible requests: %j", async ({ path, ...options }) => {
    const next = mock(async () => new Response("page"));
    await createGeoMiddleware(options)(
      { request: new Request(`https://example.com${path}`) },
      next
    );
    expect(send).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("still captures a page under /_app that is not SvelteKit's immutable assets", async () => {
    send.mockResolvedValue(new Response(null, { status: 204 }));
    await createGeoMiddleware({ token: "test-token" })(
      { request: new Request("https://example.com/_app/docs") },
      async () => new Response("page")
    );
    expect(send).toHaveBeenCalledTimes(1);
  });
});
