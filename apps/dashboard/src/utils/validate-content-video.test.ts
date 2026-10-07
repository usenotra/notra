import { expect, test } from "bun:test";

import { MAX_CONTENT_VIDEO_BYTES } from "@/constants/content-video";

import { validateContentVideo } from "./validate-content-video";

function mp4(brand: string) {
  const bytes = new Uint8Array(16);
  bytes.set([0x66, 0x74, 0x79, 0x70], 4);
  bytes.set(
    [...brand].map((character) => character.charCodeAt(0)),
    8
  );
  return bytes;
}

function ebmlDocType(type: string) {
  const payload = Uint8Array.from(type, (character) => character.charCodeAt(0));
  const inner = new Uint8Array(3 + payload.length);
  inner.set([0x42, 0x82, 0x80 | payload.length]);
  inner.set(payload, 3);
  const bytes = new Uint8Array(5 + inner.length);
  bytes.set([0x1a, 0x45, 0xdf, 0xa3, 0x80 | inner.length]);
  bytes.set(inner, 5);
  return bytes;
}

function wrappedEbmlHeaderSize(inner: Uint8Array) {
  const bytes = new Uint8Array(12 + inner.length);
  bytes.set([
    0x1a,
    0x45,
    0xdf,
    0xa3,
    0x01,
    0xff,
    0xff,
    0xff,
    0,
    0,
    0,
    inner.length,
  ]);
  bytes.set(inner, 12);
  return bytes;
}

test("accepts an mp4 and a webm", () => {
  expect(validateContentVideo(mp4("isom"))).toBe("video/mp4");
  expect(validateContentVideo(ebmlDocType("webm"))).toBe("video/webm");
});

test("rejects a webm whose EBML sizes overflow, truncate, or escape the header", () => {
  const inner = ebmlDocType("webm").subarray(5);
  expect(() => validateContentVideo(wrappedEbmlHeaderSize(inner))).toThrow(
    "Use an MP4 or WebM video"
  );
  const truncated = ebmlDocType("webm");
  truncated[4] = 0x80 | (inner.length + 10);
  expect(() => validateContentVideo(truncated)).toThrow(
    "Use an MP4 or WebM video"
  );
  const escaped = new Uint8Array(14);
  escaped.set([0x1a, 0x45, 0xdf, 0xa3, 0x85, 0x42, 0x82, 0x84]);
  escaped.set(
    Uint8Array.from("webm", (character) => character.charCodeAt(0)),
    8
  );
  expect(() => validateContentVideo(escaped)).toThrow(
    "Use an MP4 or WebM video"
  );
});

test("rejects matroska labeled as webm, a quicktime brand, markup, and a file over the cap", () => {
  expect(() => validateContentVideo(ebmlDocType("matroska"))).toThrow(
    "Use an MP4 or WebM video"
  );
  expect(() => validateContentVideo(mp4("qt  "))).toThrow(
    "Use an MP4 or WebM video"
  );
  expect(() => validateContentVideo(Buffer.from("<video></video>"))).toThrow(
    "Use an MP4 or WebM video"
  );
  expect(() =>
    validateContentVideo(Buffer.alloc(MAX_CONTENT_VIDEO_BYTES + 1))
  ).toThrow(
    `Video must be ${MAX_CONTENT_VIDEO_BYTES / (1024 * 1024)}MB or smaller`
  );
});
