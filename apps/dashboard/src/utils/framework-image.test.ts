import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import type { CachedImage } from "../types/framework-image";
import {
  getImageWidths,
  isAllowedImageUrl,
  negotiateImageFormat,
} from "./framework-image";
import {
  FrameworkImageCache,
  imageCacheMaxAge,
  isPublicImageAddress,
  optimizeFrameworkImage,
} from "./framework-image.server";

describe("image cache", () => {
  test("cache hits do not reread or reoptimize the source", async () => {
    const directory = await mkdtemp("public/image-cache-test-");
    try {
      const input = await sharp({
        create: { width: 32, height: 32, channels: 3, background: "red" },
      })
        .png()
        .toBuffer();
      await writeFile(path.join(directory, "source.png"), input);
      const url = `http://localhost/api/image?${new URLSearchParams({ url: `/${path.basename(directory)}/source.png`, w: "32", q: "75" })}`;
      const first = await optimizeFrameworkImage(new Request(url));
      expect(first.status).toBe(200);
      await rm(directory, { recursive: true });
      const second = await optimizeFrameworkImage(new Request(url));
      expect(second.status).toBe(200);
      expect(await second.arrayBuffer()).toEqual(await first.arrayBuffer());
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  test.each([
    [undefined, 14400],
    ["public, max-age=3600", 14400],
    ["max-age=86400", 86400],
    ['max-age=86400, s-maxage="172800"', 172800],
    ["MAX-AGE = 86400", 86400],
    ["max-age=invalid", 14400],
    ["private, max-age=86400", 0],
    ["no-store, max-age=86400", 0],
    ["no-cache", 0],
  ])("uses upstream policy %s", (header, expected) => {
    expect(imageCacheMaxAge(header)).toBe(expected);
  });

  test("expires entries and bounds storage using least recently used eviction", () => {
    const cache = new FrameworkImageCache(6, 2);
    const image: CachedImage = {
      data: Buffer.from("abc"),
      contentType: "image/png",
      etag: '"test"',
      createdAt: 0,
      maxAge: 10,
    };
    cache.set("first", image);
    cache.set("second", image);
    expect(cache.get("first", 100)).toBe(image);
    cache.set("third", image);
    expect(cache.get("second", 100)).toBeUndefined();
    expect(cache.get("first", 9999)).toBe(image);
    expect(cache.get("first", 10000)).toBeUndefined();
    cache.set("oversized", { ...image, data: Buffer.alloc(7) });
    cache.set("uncached", { ...image, maxAge: 0 });
    expect(cache.get("oversized", 0)).toBeUndefined();
    expect(cache.get("uncached", 0)).toBeUndefined();
    cache.set("third", { ...image, data: Buffer.alloc(6) });
    cache.set("fourth", image);
    expect(cache.get("third", 0)).toBeUndefined();
    expect(cache.get("fourth", 0)).toBe(image);
  });

  test("serves cached bytes, format-specific ETags and conditional responses", async () => {
    const url =
      "http://localhost/api/image?url=%2Fdemo%2Ffieldnote-homepage.png&w=32&q=75";
    const first = await optimizeFrameworkImage(
      new Request(url, { headers: { Accept: "image/webp" } })
    );
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBe(
      "public, max-age=14400, s-maxage=14400, must-revalidate"
    );
    const etag = first.headers.get("etag") ?? "";
    expect(etag).toMatch(/^"[\w-]+"$/);
    const second = await optimizeFrameworkImage(
      new Request(url, { headers: { Accept: "image/webp" } })
    );
    expect(second.headers.get("etag")).toBe(etag);
    expect(await second.arrayBuffer()).toEqual(await first.arrayBuffer());
    for (const validator of [etag, `"unrelated", W/${etag}`, "*"]) {
      const response = await optimizeFrameworkImage(
        new Request(url, {
          headers: { Accept: "image/webp", "If-None-Match": validator },
        })
      );
      expect(response.status).toBe(304);
      expect(await response.text()).toBe("");
      expect(response.headers.get("etag")).toBe(etag);
      expect(response.headers.get("content-security-policy")).toContain(
        "sandbox"
      );
      expect(response.headers.get("vary")).toBe("Accept");
    }
    const avif = await optimizeFrameworkImage(
      new Request(url, {
        headers: { Accept: "image/avif", "If-None-Match": etag },
      })
    );
    expect(avif.status).toBe(200);
    expect(avif.headers.get("etag")).not.toBe(etag);
    const head = await optimizeFrameworkImage(
      new Request(url, { method: "HEAD", headers: { Accept: "image/webp" } })
    );
    expect(head.status).toBe(200);
    expect(head.headers.get("etag")).toBe(etag);
    expect(await head.text()).toBe("");
  });

  test("preserves SVG bytes and security headers through conditional caching", async () => {
    const url = "http://localhost/api/image?url=%2Ficon0.svg&w=48&q=75";
    const first = await optimizeFrameworkImage(new Request(url));
    expect(first.status).toBe(200);
    expect(first.headers.get("content-type")).toBe("image/svg+xml");
    expect(await first.text()).toContain("<svg");
    const response = await optimizeFrameworkImage(
      new Request(url, {
        headers: { "If-None-Match": first.headers.get("etag") ?? "" },
      })
    );
    expect(response.status).toBe(304);
    expect(response.headers.get("content-disposition")).toStartWith(
      "attachment;"
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});

describe("image source policy", () => {
  test.each([
    "https://logos.context.dev/example",
    "https://www.google.com/s2/favicons?domain=example.com",
    "https://pbs.twimg.com/profile_images/test.jpg",
    "https://media.brand.dev/logo.svg",
    "https://models.dev/logos/openai.svg",
    "https://assets.r2.dev/demo.png",
    "https://account.r2.cloudflarestorage.com/demo.png",
  ])("accepts configured remote pattern %s", (source) => {
    expect(isAllowedImageUrl(new URL(source))).toBe(true);
  });

  test.each([
    "http://logos.context.dev/example",
    "https://www.google.com/redirect",
    "https://logos.context.dev.evil.example/a.png",
    "https://r2.dev.evil.example/a.png",
    "https://user:password@models.dev/a.png",
    "https://models.dev:8443/a.png",
    "https://127.0.0.1/a.png",
    "file:///etc/passwd",
  ])("rejects untrusted source %s", (source) => {
    expect(isAllowedImageUrl(new URL(source))).toBe(false);
  });

  test.each([
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "192.168.1.1",
    "172.16.0.1",
    "100.64.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fe80::1",
    "fc00::1",
  ])("rejects private or mapped destination %s", (address) => {
    expect(isPublicImageAddress(address)).toBe(false);
  });

  test("accepts public IP addresses", () => {
    expect(isPublicImageAddress("1.1.1.1")).toBe(true);
    expect(isPublicImageAddress("2606:4700:4700::1111")).toBe(true);
  });
});

describe("image output", () => {
  test("negotiates AVIF and WebP with quality preferences", () => {
    expect(negotiateImageFormat("image/avif,image/webp,*/*")).toBe("avif");
    expect(negotiateImageFormat("image/avif;q=0,image/webp")).toBe("webp");
    expect(negotiateImageFormat("image/avif;q=0.5,image/webp;q=1")).toBe(
      "webp"
    );
    expect(negotiateImageFormat("image/png,*/*")).toBeUndefined();
  });

  test("generates density widths for fixed images", () => {
    expect(getImageWidths(40)).toEqual({ widths: [48, 96], kind: "x" });
    expect(getImageWidths(undefined, "100vw").kind).toBe("w");
  });

  test.each(["avif", "webp"])(
    "optimizes the local demo PNG as %s",
    async (format) => {
      const request = new Request(
        `http://localhost/api/image?url=%2Fdemo%2Ffieldnote-homepage.png&w=64&q=75`,
        { headers: { Accept: `image/${format}` } }
      );
      const response = await optimizeFrameworkImage(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe(`image/${format}`);
      expect(response.headers.get("content-disposition")).toStartWith(
        "attachment;"
      );
      expect(response.headers.get("content-security-policy")).toBe(
        "default-src 'self'; script-src 'none'; sandbox;"
      );
      expect(response.headers.get("vary")).toBe("Accept");
      const metadata = await sharp(
        Buffer.from(await response.arrayBuffer())
      ).metadata();
      expect(metadata.width).toBe(64);
      expect(metadata.format).toBe(format === "avif" ? "heif" : format);
    }
  );

  test.each([
    "/api/image?url=%2F..%2Fpackage.json&w=64&q=75",
    "/api/image?url=file%3A%2F%2F%2Fetc%2Fpasswd&w=64&q=75",
    "/api/image?url=https%3A%2F%2F127.0.0.1%2Fimage.png&w=64&q=75",
    "/api/image?url=%2Fdemo%2Ffieldnote-homepage.png&w=9999&q=75",
    "/api/image?url=%2Fdemo%2Ffieldnote-homepage.png&w=64&q=100",
  ])("rejects unsafe or invalid request %s", async (url) => {
    expect(
      (await optimizeFrameworkImage(new Request(`http://localhost${url}`)))
        .status
    ).toBe(400);
  });
});
