import type { RenderFontId } from "@notra/ai/types/repo-image";

const fontCache = new Map<RenderFontId, ArrayBuffer>();

export async function loadRenderFont(
  family: RenderFontId
): Promise<ArrayBuffer> {
  const cached = fontCache.get(family);
  if (cached) {
    return cached;
  }

  const { RENDER_FONT_DATA } =
    await import("@notra/ai/constants/render-font-data");
  const data = new Uint8Array(Buffer.from(RENDER_FONT_DATA[family], "base64"))
    .buffer;
  fontCache.set(family, data);
  return data;
}
