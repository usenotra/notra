import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";

import sharp from "sharp";

import { optimizeFrameworkImage } from "./framework-image.server";

afterEach(() => mock.restore());

function imageRequest(
  source: string,
  accept = "image/webp",
  width = 128,
  method = "GET",
  etag?: string
) {
  return new Request(
    `http://localhost/api/image?${new URLSearchParams({ url: source, w: String(width), q: "75" })}`,
    {
      method,
      headers: {
        Accept: accept,
        ...(etag ? { "If-None-Match": etag } : {}),
      },
    }
  );
}

function imageSource(pathname = "/demo/fieldnote-homepage.png") {
  return `${pathname}?coalescing=${crypto.randomUUID()}`;
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
      optimizeFrameworkImage(imageRequest(source, "image/webp", 128, "HEAD")),
      optimizeFrameworkImage(
        imageRequest(source, "image/webp", 128, "GET", "*")
      ),
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

  test("does not combine different formats, widths or sources", async () => {
    const encode = spyOn(sharp.prototype, "toBuffer");
    const source = imageSource();
    const requests = [
      imageRequest(source, "image/webp", 128),
      imageRequest(source, "image/avif", 128),
      imageRequest(source, "image/webp", 256),
      imageRequest(imageSource("/icon1.png"), "image/webp", 48),
    ];
    const responses = await Promise.all(requests.map(optimizeFrameworkImage));
    expect(encode).toHaveBeenCalledTimes(4);
    expect(
      responses.map((response) => response.headers.get("content-type"))
    ).toEqual(["image/webp", "image/avif", "image/webp", "image/webp"]);
    for (const [index, response] of responses.entries()) {
      expect(response.status).toBe(200);
      const metadata = await sharp(
        Buffer.from(await response.arrayBuffer())
      ).metadata();
      let expectedWidth = 128;
      if (index === 2) {
        expectedWidth = 256;
      }
      if (index === 3) {
        expectedWidth = 48;
      }
      expect(metadata.width).toBe(expectedWidth);
    }
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

  test("shares SVG reads without changing bytes or response security headers", async () => {
    const metadata = spyOn(sharp.prototype, "metadata");
    const source = imageSource("/icon0.svg");
    const responses = await Promise.all([
      optimizeFrameworkImage(imageRequest(source)),
      optimizeFrameworkImage(imageRequest(source)),
    ]);
    expect(metadata).toHaveBeenCalledTimes(1);
    const bodies = await Promise.all(
      responses.map((response) => response.text())
    );
    expect(bodies[0]).toContain("<svg");
    expect(bodies[1]).toBe(bodies[0]);
    for (const response of responses) {
      expect(response.headers.get("content-type")).toBe("image/svg+xml");
      expect(response.headers.get("content-security-policy")).toContain(
        "sandbox"
      );
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    }
  });
});
