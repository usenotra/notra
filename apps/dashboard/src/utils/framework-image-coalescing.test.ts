import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";

import sharp from "sharp";

import { optimizeFrameworkImage } from "./framework-image.server";

afterEach(() => mock.restore());

function imageRequest(source: string, method = "GET", etag?: string) {
  return new Request(
    `http://localhost/api/image?${new URLSearchParams({ url: source, w: "128", q: "75" })}`,
    {
      method,
      headers: {
        Accept: "image/webp",
        ...(etag ? { "If-None-Match": etag } : {}),
      },
    }
  );
}

function imageSource() {
  return `/demo/fieldnote-homepage.png?coalescing=${crypto.randomUUID()}`;
}

describe("in-flight image coalescing", () => {
  test("encodes identical simultaneous misses once and gives each response its own body", async () => {
    const encode = spyOn(sharp.prototype, "toBuffer");
    const source = imageSource();
    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        optimizeFrameworkImage(imageRequest(source))
      )
    );
    expect(encode).toHaveBeenCalledTimes(1);
    const bodies = await Promise.all(
      responses.map(async (response) => {
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("image/webp");
        return Buffer.from(await response.arrayBuffer());
      })
    );
    const firstBody = bodies[0];
    if (!firstBody) {
      throw new Error("Missing first image response");
    }
    expect(firstBody.length).toBeGreaterThan(0);
    for (const body of bodies) {
      expect(body).toEqual(firstBody);
    }
    const cached = await optimizeFrameworkImage(imageRequest(source));
    expect(Buffer.from(await cached.arrayBuffer())).toEqual(firstBody);
    expect(encode).toHaveBeenCalledTimes(1);
  });

  test("keeps GET, HEAD and conditional responses separate while sharing the image", async () => {
    const encode = spyOn(sharp.prototype, "toBuffer");
    const source = imageSource();
    const responses = await Promise.all([
      optimizeFrameworkImage(imageRequest(source)),
      optimizeFrameworkImage(imageRequest(source, "HEAD")),
      optimizeFrameworkImage(imageRequest(source, "GET", "*")),
    ]);
    expect(encode).toHaveBeenCalledTimes(1);
    expect(responses.map((response) => response.status)).toEqual([
      200, 200, 304,
    ]);
    expect((await responses[0].arrayBuffer()).byteLength).toBeGreaterThan(0);
    expect((await responses[1].arrayBuffer()).byteLength).toBe(0);
    expect((await responses[2].arrayBuffer()).byteLength).toBe(0);
    expect(
      new Set(responses.map((response) => response.headers.get("etag"))).size
    ).toBe(1);
  });

  test("removes failed work so the next request can retry", async () => {
    const encode = spyOn(sharp.prototype, "toBuffer");
    encode.mockImplementationOnce(() =>
      Promise.reject(new Error("encoder failed"))
    );
    const source = imageSource();
    const failed = await Promise.all(
      Array.from({ length: 3 }, () =>
        optimizeFrameworkImage(imageRequest(source))
      )
    );
    expect(failed.map((response) => response.status)).toEqual([400, 400, 400]);
    expect(encode).toHaveBeenCalledTimes(1);
    expect((await optimizeFrameworkImage(imageRequest(source))).status).toBe(
      200
    );
    expect(encode).toHaveBeenCalledTimes(2);
  });
});
