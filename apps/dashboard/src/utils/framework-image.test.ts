import { describe, expect, test } from "bun:test";

import { isAllowedImageUrl } from "./framework-image";
import {
  isPublicImageAddress,
  optimizeFrameworkImage,
} from "./framework-image.server";

describe("image cache", () => {
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
