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
});
