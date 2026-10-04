import { expect, mock, test } from "bun:test";

import { ORPCError } from "@orpc/server";

import { MAX_CHAT_HEIC_MULTIPART_BYTES } from "@/constants/content-image";

const authenticate = mock(async () => {});
const convert = mock(async () => ({
  bytes: Buffer.from("jpeg"),
  mimeType: "image/jpeg" as const,
}));

mock.module("@/lib/auth/organization", () => ({
  assertAuthenticated: authenticate,
}));
mock.module("@/utils/compress-content-image", () => ({
  compressContentImage: convert,
  isHeic: (bytes: Uint8Array) =>
    bytes.byteLength >= 16 &&
    Buffer.from(bytes.subarray(4, 8)).toString("ascii") === "ftyp",
}));

const { POST } = await import("../src/app/api/uploads/convert-heic/route");

// Simulate untrusted streaming bodies whose Content-Length is missing or intentionally inaccurate.
function streamedRequest(length: number, declaredLength?: string) {
  let canceled = false;
  let sent = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (!sent) {
        controller.enqueue(new Uint8Array(length));
        sent = true;
      }
    },
    cancel() {
      canceled = true;
    },
  });
  const request = new Request("http://localhost/api/uploads/convert-heic", {
    method: "POST",
    headers: declaredLength ? { "Content-Length": declaredLength } : {},
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  return { request, wasCanceled: () => canceled };
}

test.each([undefined, "bad", "10"])(
  "rejects an oversized streamed multipart body despite Content-Length %p",
  async (declaredLength) => {
    const { request, wasCanceled } = streamedRequest(
      MAX_CHAT_HEIC_MULTIPART_BYTES + 1,
      declaredLength
    );
    const result = await POST(request);
    expect(result.status).toBe(413);
    expect(wasCanceled()).toBe(true);
    expect(convert).not.toHaveBeenCalled();
  }
);

test("rejects an oversized declared length before consuming the body", async () => {
  const { request, wasCanceled } = streamedRequest(
    100,
    String(MAX_CHAT_HEIC_MULTIPART_BYTES + 1)
  );
  expect((await POST(request)).status).toBe(413);
  expect(wasCanceled()).toBe(false);
});

test("authenticates before reading an oversized upload stream", async () => {
  authenticate.mockImplementationOnce(async () => {
    throw new ORPCError("UNAUTHORIZED");
  });
  const { request, wasCanceled } = streamedRequest(
    MAX_CHAT_HEIC_MULTIPART_BYTES + 1
  );
  expect((await POST(request)).status).toBe(401);
  expect(wasCanceled()).toBe(false);
});
