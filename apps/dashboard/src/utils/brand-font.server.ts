import {
  BRAND_FONT_API_URL,
  BRAND_FONT_CDN_ORIGIN,
  BRAND_FONT_CSS_MAX_BYTES,
  BRAND_FONT_CSS_URL_RE,
  BRAND_FONT_FETCH_TIMEOUT_MS,
  BRAND_FONT_FILE_MAX_BYTES,
  BRAND_FONT_FILE_PATH_RE,
  BRAND_FONT_METADATA_MAX_BYTES,
} from "@/constants/brand-font";
import { fontsourceFamilyListSchema } from "@/schemas/brand-font";
import { readBoundedRequestBody } from "@/utils/read-bounded-request-body";

async function fetchFontAsset(url: string, maxBytes: number) {
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(BRAND_FONT_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("Font unavailable");
  }
  const bytes = await readBoundedRequestBody(response, maxBytes);
  if (!bytes?.byteLength) {
    throw new Error("Font unavailable");
  }
  return bytes;
}

export async function loadBrandFontStylesheet(family: string): Promise<string> {
  const url = new URL(BRAND_FONT_API_URL);
  url.searchParams.set("family", family);
  const metadata = await fetchFontAsset(
    url.toString(),
    BRAND_FONT_METADATA_MAX_BYTES
  );
  const fonts = fontsourceFamilyListSchema.parse(
    JSON.parse(new TextDecoder().decode(metadata))
  );
  const font = fonts.find(
    (item) => item.family.toLowerCase() === family.toLowerCase()
  );
  if (!font) {
    throw new Error("Font unavailable");
  }

  const bytes = await fetchFontAsset(
    `${BRAND_FONT_CDN_ORIGIN}/fontsource/css/${font.id}@latest/index.css`,
    BRAND_FONT_CSS_MAX_BYTES
  );
  const css = new TextDecoder().decode(bytes);
  let count = 0;
  const localCss = css.replace(BRAND_FONT_CSS_URL_RE, (_, source: string) => {
    const file = new URL(source);
    if (
      file.origin !== BRAND_FONT_CDN_ORIGIN ||
      file.username ||
      file.password ||
      file.search ||
      file.hash ||
      !BRAND_FONT_FILE_PATH_RE.test(file.pathname)
    ) {
      throw new Error("Unsupported font file URL");
    }
    count += 1;
    return `url("/api/brand-font/file?path=${encodeURIComponent(file.pathname)}")`;
  });
  if (count === 0 || /https?:\/\/|@import/i.test(localCss)) {
    throw new Error("Unsupported font stylesheet");
  }
  return localCss;
}

export async function loadBrandFontFile(path: string) {
  if (!BRAND_FONT_FILE_PATH_RE.test(path)) {
    throw new Error("Invalid font path");
  }
  return await fetchFontAsset(
    `${BRAND_FONT_CDN_ORIGIN}${path}`,
    BRAND_FONT_FILE_MAX_BYTES
  );
}
