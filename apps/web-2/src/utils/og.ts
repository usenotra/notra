import inter400 from "@fontsource/inter/files/inter-latin-400-normal.woff?inline";
import inter500 from "@fontsource/inter/files/inter-latin-500-normal.woff?inline";
import inter600 from "@fontsource/inter/files/inter-latin-600-normal.woff?inline";

const PUBLIC_AUTHOR_IMAGES = import.meta.glob<string>(
  "/public/blog/authors/*.{png,jpg,jpeg,webp,avif}",
  { query: "?inline", import: "default" }
);

const INTER_FONT_DATA_URLS = {
  400: inter400,
  500: inter500,
  600: inter600,
} as const;

export function splitTitleForDot(title: string) {
  const words = title.split(" ");
  const lastWord = words.at(-1) ?? title;
  const leading: { word: string; key: string }[] = [];
  let cursor = 0;
  for (const word of words.slice(0, -1)) {
    leading.push({ word, key: `word-${cursor}` });
    cursor += word.length + 1;
  }
  return { leading, lastWord };
}

export function loadInterFont(weight: keyof typeof INTER_FONT_DATA_URLS) {
  const [, base64 = ""] = INTER_FONT_DATA_URLS[weight].split(",");
  return Buffer.from(base64, "base64");
}

export function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export async function loadImageAsDataUrl(url: string | null) {
  if (!url) {
    return null;
  }
  try {
    let input: Buffer;
    if (url.startsWith("/")) {
      const loadPublicImage = PUBLIC_AUTHOR_IMAGES[`/public${url}`];
      if (!loadPublicImage) {
        return null;
      }
      const dataUrl = await loadPublicImage();
      input = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
    } else {
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      input = Buffer.from(await response.arrayBuffer());
    }
    const { default: sharp } = await import("sharp");
    const png = await sharp(input).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}
