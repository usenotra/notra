/// <reference types="bun-types" />

import { afterEach, expect, test } from "bun:test";

import { NextRequest } from "next/server";

import { isSameOriginRequest } from "./same-origin";

const originalVercel = process.env.VERCEL;

afterEach(() => {
  if (originalVercel === undefined) {
    delete process.env.VERCEL;
  } else {
    process.env.VERCEL = originalVercel;
  }
});

test("rejects a matching host with a different scheme", () => {
  delete process.env.VERCEL;
  const request = new NextRequest("http://example.com/api/offering-check", {
    headers: { host: "example.com", origin: "https://example.com" },
  });

  expect(isSameOriginRequest(request)).toBe(false);
});

test("accepts an exact origin", () => {
  delete process.env.VERCEL;
  const request = new NextRequest("http://example.com/api/offering-check", {
    headers: { host: "example.com", origin: "http://example.com" },
  });

  expect(isSameOriginRequest(request)).toBe(true);
});

test("uses Vercel's trusted forwarded protocol and host", () => {
  process.env.VERCEL = "1";
  const request = new NextRequest("http://internal/api/offering-check", {
    headers: {
      host: "internal",
      origin: "https://example.com",
      "x-forwarded-host": "example.com",
      "x-forwarded-proto": "https",
    },
  });

  expect(isSameOriginRequest(request)).toBe(true);
});
