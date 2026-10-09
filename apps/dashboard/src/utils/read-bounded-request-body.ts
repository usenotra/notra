// Bound streamed bodies by bytes actually consumed even when the declared length is absent or false.
export async function readBoundedRequestBody(
  request: Request | Response,
  maxBytes: number
): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!request.body) {
    return new Uint8Array();
  }
  const chunks: Uint8Array[] = [];
  const reader = request.body.getReader();
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      size += value.byteLength;
      if (size > maxBytes) {
        void reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
