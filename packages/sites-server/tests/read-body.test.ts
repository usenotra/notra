import { expect, test } from "bun:test";

import { readBodyUpTo } from "../src/utils/read-body";

test("capped reader preserves the bounded prefix of an oversized first chunk", async () => {
  let cancelled = false;
  const chunk = new Uint8Array(1024 * 1024);
  chunk.set(new TextEncoder().encode("landing-page-metadata"));
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(chunk);
      },
      cancel() {
        cancelled = true;
      },
    })
  );
  const result = await readBodyUpTo(response, 8192);
  expect(result.exceeded).toBe(true);
  expect(result.bytes.byteLength).toBe(8192);
  expect(result.bytes).toEqual(chunk.subarray(0, 8192));
  expect(cancelled).toBe(true);
});

test("capped reader preserves earlier chunks and the remaining overflow prefix", async () => {
  let cancelled = false;
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("12"));
        controller.enqueue(new TextEncoder().encode("345678"));
      },
      cancel() {
        cancelled = true;
      },
    })
  );
  const result = await readBodyUpTo(response, 4);
  expect(result.exceeded).toBe(true);
  expect(new TextDecoder().decode(result.bytes)).toBe("1234");
  expect(cancelled).toBe(true);
});

test("capped reader preserves bodies exactly at the byte limit", async () => {
  const result = await readBodyUpTo(new Response("1234"), 4);
  expect(result.exceeded).toBe(false);
  expect(new TextDecoder().decode(result.bytes)).toBe("1234");
});
