import { localUrl } from "./benchmark-config.mjs";

export async function measureHttp(url, timeoutMs) {
  const target = localUrl(url);
  const start = performance.now();
  try {
    const response = await fetch(target, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "accept-encoding": "identity" },
    });
    const headersMs = performance.now() - start;
    let bytes = 0;
    if (response.body) {
      for await (const chunk of response.body) {
        bytes += chunk.byteLength;
      }
    }
    return {
      status: response.status,
      headersMs,
      totalMs: performance.now() - start,
      bytes,
      error: null,
    };
  } catch (error) {
    return {
      status: null,
      headersMs: null,
      totalMs: performance.now() - start,
      bytes: null,
      error: error instanceof Error ? error.name : "UnknownError",
    };
  }
}
