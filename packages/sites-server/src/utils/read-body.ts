import type { CappedBody } from "../types/http";

export async function readBodyUpTo(
  response: Response,
  maxBytes: number
): Promise<CappedBody> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  let exceeded = false;
  const reader = response.body?.getReader();
  if (reader) {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (value.byteLength > maxBytes - total) {
          chunks.push(value.subarray(0, maxBytes - total));
          total = maxBytes;
          exceeded = true;
          await reader.cancel().catch(() => undefined);
          break;
        }
        chunks.push(value);
        total += value.byteLength;
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, exceeded };
}
