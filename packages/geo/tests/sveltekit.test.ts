import {
  afterAll,
  afterEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";

import { createGeoHandle } from "../src/sveltekit";
import { Tracker } from "../src/tracker";

const send = spyOn(globalThis, "fetch");

afterAll(() => {
  send.mockRestore();
});

afterEach(() => {
  send.mockReset();
});

describe("SvelteKit handle", () => {
  test("sends the request envelope and preserves the downstream response", async () => {
    send.mockResolvedValue(new Response(null, { status: 204 }));
    const request = new Request(
      "https://example.com/docs?utm_source=chatgpt.com",
      {
        headers: { "user-agent": "GPTBot", referer: "https://chatgpt.com/" },
      }
    );
    const response = new Response("page");
    const resolve = mock(async () => response);
    const handle = createGeoHandle({ token: "test-token" });

    expect(await handle({ event: { request }, resolve })).toBe(response);
    expect(resolve).toHaveBeenCalledTimes(1);
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

  test("accepts a synchronous resolve result", async () => {
    const response = new Response("page");
    expect(
      await createGeoHandle({ token: "" })({
        event: { request: new Request("https://example.com/") },
        resolve: () => response,
      })
    ).toBe(response);
  });

  test("runs the handler while sending and waits for capture before returning", async () => {
    const sent = Promise.withResolvers<Response>();
    send.mockReturnValue(sent.promise);
    const resolve = mock(async () => new Response("page"));
    let completed = false;
    const pending = createGeoHandle({ token: "test-token" })({
      event: { request: new Request("https://example.com/") },
      resolve,
    }).then((result) => {
      completed = true;
      return result;
    });

    await Promise.resolve();
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(completed).toBe(false);
    sent.resolve(new Response(null, { status: 204 }));
    expect(await (await pending).text()).toBe("page");
  });

  test("keeps serving the page if ingest fails", async () => {
    const error = new Error("network unavailable");
    send.mockRejectedValue(error);
    const onError = mock();
    const response = new Response("page");
    const result = await createGeoHandle({ token: "test-token", onError })({
      event: { request: new Request("https://example.com/") },
      resolve: async () => response,
    });
    expect(result).toBe(response);
    expect(onError).toHaveBeenCalledWith(error);
  });

  test("keeps serving the page if onError throws", async () => {
    send.mockRejectedValue(new Error("network unavailable"));
    const response = new Response("page");
    const result = await createGeoHandle({
      token: "test-token",
      onError: () => {
        throw new Error("callback failed");
      },
    })({
      event: { request: new Request("https://example.com/") },
      resolve: async () => response,
    });
    expect(result).toBe(response);
  });

  test("keeps serving the page if tracking rejects", async () => {
    const track = spyOn(Tracker.prototype, "track").mockRejectedValue(
      new Error("capture failed")
    );
    const response = new Response("page");
    try {
      expect(
        await createGeoHandle({ token: "test-token" })({
          event: { request: new Request("https://example.com/") },
          resolve: async () => response,
        })
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
        createGeoHandle({ token: "test-token" })({
          event: { request: new Request("https://example.com/") },
          resolve: () => Promise.reject(error),
        })
      ).rejects.toBe(error);
    } finally {
      track.mockRestore();
    }
  });

  test("preserves downstream errors and still finishes tracking", async () => {
    const sent = Promise.withResolvers<Response>();
    send.mockReturnValue(sent.promise);
    const error = new Error("route failed");
    const pending = createGeoHandle({ token: "test-token" })({
      event: { request: new Request("https://example.com/") },
      resolve: () => Promise.reject(error),
    });
    sent.resolve(new Response(null, { status: 204 }));
    await expect(pending).rejects.toBe(error);
    expect(send).toHaveBeenCalledTimes(1);
  });

  test.each([
    { token: "", path: "/docs" },
    { token: "test-token", path: "/api/private" },
    { token: "test-token", path: "/_app/immutable/entry.js" },
    { token: "test-token", path: "/docs", sample: 0 },
    { token: "test-token", path: "/private", exclude: ["/private"] },
  ])("skips ineligible requests: %j", async ({ path, ...options }) => {
    const resolve = mock(async () => new Response("page"));
    await createGeoHandle(options)({
      event: { request: new Request(`https://example.com${path}`) },
      resolve,
    });
    expect(send).not.toHaveBeenCalled();
    expect(resolve).toHaveBeenCalledTimes(1);
  });
});
