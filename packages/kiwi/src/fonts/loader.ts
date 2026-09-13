import { type Font, parse } from "opentype.js";

let fallbackFontPromise: Promise<Font> | null = null;

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function parseFallbackFont(): Promise<Font> {
  // Imported lazily so the base64 font payload never lands in a first-load chunk.
  const { INTER_TTF_BASE64 } = await import("./inter-data");
  return parse(base64ToArrayBuffer(INTER_TTF_BASE64));
}

export async function loadFallbackFont(): Promise<Font> {
  fallbackFontPromise ??= parseFallbackFont().catch((error: unknown) => {
    // Do not memoize a failed chunk load; the next call retries the import.
    fallbackFontPromise = null;
    throw error;
  });
  return fallbackFontPromise;
}

export async function loadTextFont(): Promise<Font | null> {
  try {
    return await loadFallbackFont();
  } catch (error) {
    console.warn("[kiwi] failed to load fallback text font", error);
    return null;
  }
}
