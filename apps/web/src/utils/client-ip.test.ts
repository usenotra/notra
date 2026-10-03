/// <reference types="bun-types" />

import { afterEach, describe, expect, test } from "bun:test";

import { NextRequest } from "next/server";

import { getClientIp } from "./client-ip";

const originalVercel = process.env.VERCEL;

afterEach(() => {
  if (originalVercel === undefined) {
    delete process.env.VERCEL;
  } else {
    process.env.VERCEL = originalVercel;
  }
});

describe("getClientIp", () => {
  test("ignores spoofed Vercel headers outside Vercel", () => {
    delete process.env.VERCEL;
    const request = new NextRequest("http://example.com", {
      headers: {
        "x-real-ip": "192.0.2.10",
        "x-vercel-forwarded-for": "198.51.100.1",
      },
    });

    expect(getClientIp(request)).toBe("192.0.2.10");
  });

  test("uses Vercel's trusted forwarding header on Vercel", () => {
    process.env.VERCEL = "1";
    const request = new NextRequest("https://example.com", {
      headers: { "x-vercel-forwarded-for": "198.51.100.1, 192.0.2.1" },
    });

    expect(getClientIp(request)).toBe("198.51.100.1");
  });
});
