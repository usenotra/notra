import { readFile } from "node:fs/promises";
import { join } from "node:path";

const GOOGLE_FONT_URL_REGEX =
  /src: url\((.+)\) format\('(opentype|truetype)'\)/;

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

export async function loadGoogleFont(family: string, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(
    / /g,
    "+"
  )}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const fontUrl = css.match(GOOGLE_FONT_URL_REGEX)?.[1];
  if (!fontUrl) {
    throw new Error(`Failed to resolve font URL for ${family}`);
  }
  const fontResponse = await fetch(fontUrl);
  if (!fontResponse.ok) {
    throw new Error(`Failed to fetch font file for ${family}`);
  }
  return fontResponse.arrayBuffer();
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
      input = await readFile(join(process.cwd(), "public", url));
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
