import { Effect } from "effect";

import type { CappedBody } from "../types/http";
import { runSitesEffect } from "./run-sites-effect";

export const readBodyUpToEffect = Effect.fn("Sites.readBodyUpTo")(function* (
  response: Response,
  maxBytes: number
) {
  const chunks: Uint8Array[] = [];
  let total = 0;
  let exceeded = false;
  let exhausted = false;
  const body = response.body;
  if (body) {
    yield* Effect.acquireUseRelease(
      Effect.try({
        try: () => body.getReader(),
        catch: (error) => error,
      }),
      (reader) =>
        Effect.gen(function* () {
          for (;;) {
            const { done, value } = yield* Effect.tryPromise({
              try: () => reader.read(),
              catch: (error) => error,
            });
            if (done) {
              exhausted = true;
              break;
            }
            if (value.byteLength > maxBytes - total) {
              chunks.push(value.subarray(0, maxBytes - total));
              total = maxBytes;
              exceeded = true;
              break;
            }
            chunks.push(value);
            total += value.byteLength;
          }
        }),
      (reader) =>
        Effect.sync(() => {
          if (!exhausted) {
            void reader.cancel().catch(() => undefined);
          }
          reader.releaseLock();
        })
    );
  }
  const bytes = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, exceeded } satisfies CappedBody;
});

export function readBodyUpTo(
  response: Response,
  maxBytes: number
): Promise<CappedBody> {
  return runSitesEffect(readBodyUpToEffect(response, maxBytes));
}
