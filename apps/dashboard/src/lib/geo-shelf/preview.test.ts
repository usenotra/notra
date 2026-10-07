import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { LookupAddress } from "node:dns";

const lookup = mock(async (): Promise<LookupAddress[]> => [
  { address: "93.184.216.34", family: 4 as const },
]);
const fetchWebpage = mock(async ({ url }: { url: string }) => ({
  success: true as const,
  url,
  markdown: "",
  metadata: { title: "Example" },
}));

mock.module("node:dns/promises", () => ({ lookup }));
mock.module("@notra/ai/utils/context-dev", () => ({
  fetchWebpage,
  isContextDevConfigured: () => Boolean(process.env.CONTEXT_DEV_API_KEY),
}));

const { isPublicShelfAddress, previewGeoShelfUrl } = await import("./preview");

describe("GEO shelf preview network validation", () => {
  beforeEach(() => {
    process.env.CONTEXT_DEV_API_KEY = "test-key";
    lookup.mockClear();
    fetchWebpage.mockClear();
    lookup.mockImplementation(async () => [
      { address: "93.184.216.34", family: 4 as const },
    ]);
  });

  test("classifies public and non-public IPv4 and IPv6 addresses", () => {
    expect(isPublicShelfAddress("93.184.216.34", 4)).toBeTrue();
    expect(isPublicShelfAddress("127.0.0.1", 4)).toBeFalse();
    expect(isPublicShelfAddress("169.254.169.254", 4)).toBeFalse();
    expect(isPublicShelfAddress("10.0.0.1", 4)).toBeFalse();
    expect(isPublicShelfAddress("198.51.100.1", 4)).toBeFalse();

    expect(isPublicShelfAddress("2606:4700:4700::1111", 6)).toBeTrue();
    expect(isPublicShelfAddress("::1", 6)).toBeFalse();
    expect(isPublicShelfAddress("fe80::1", 6)).toBeFalse();
    expect(isPublicShelfAddress("fd00::1", 6)).toBeFalse();
    expect(isPublicShelfAddress("::ffff:127.0.0.1", 6)).toBeFalse();
    expect(isPublicShelfAddress("2001:db8::1", 6)).toBeFalse();
    expect(isPublicShelfAddress("fec0::1", 6)).toBeFalse();

    expect(isPublicShelfAddress("64:ff9b::5db8:d822", 6)).toBeTrue();
    expect(isPublicShelfAddress("64:ff9b::7f00:1", 6)).toBeFalse();
    expect(isPublicShelfAddress("64:ff9b::a9fe:a9fe", 6)).toBeFalse();
    expect(isPublicShelfAddress("64:ff9b:1::5db8:d822", 6)).toBeFalse();
  });

  test("does not call fetchWebpage when DNS resolves to a private address", async () => {
    lookup.mockImplementation(async () => [
      { address: "127.0.0.1", family: 4 as const },
    ]);

    const result = await previewGeoShelfUrl("https://127.0.0.1.nip.io/page");

    expect(result.available).toBeFalse();
    expect(fetchWebpage).not.toHaveBeenCalled();
  });

  test("does not call fetchWebpage when DNS changes during the preflight", async () => {
    lookup
      .mockImplementationOnce(async () => [
        { address: "93.184.216.34", family: 4 as const },
      ])
      .mockImplementationOnce(async () => [
        { address: "93.184.216.35", family: 4 as const },
      ]);

    const result = await previewGeoShelfUrl(
      "https://public-looking.example.com/page"
    );

    expect(result.available).toBeFalse();
    expect(fetchWebpage).not.toHaveBeenCalled();
  });

  test("rejects a private redirect destination returned by fetchWebpage", async () => {
    fetchWebpage.mockImplementationOnce(async ({ url }) => ({
      success: true as const,
      url,
      markdown: "",
      metadata: {
        title: "Internal",
        finalUrl: "https://redirected.example.com/private",
      },
    }));
    lookup
      .mockImplementationOnce(async () => [
        { address: "93.184.216.34", family: 4 as const },
      ])
      .mockImplementationOnce(async () => [
        { address: "93.184.216.34", family: 4 as const },
      ])
      .mockImplementationOnce(async () => [
        { address: "169.254.169.254", family: 4 as const },
      ]);

    const result = await previewGeoShelfUrl(
      "https://public-looking.example.com/page"
    );

    expect(fetchWebpage).toHaveBeenCalledTimes(1);
    expect(result.available).toBeFalse();
  });
});
