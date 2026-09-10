import { decode, encode } from "blurhash";
import sharp from "sharp";

// Build-time only: pass a local filename or image bytes, never import into client code.
export async function generateImagePlaceholder(input: string | Buffer) {
  const { data, info } = await sharp(input)
    .rotate()
    .resize(32, 32, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const blurhash = encode(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    4,
    4
  );
  const pixels = decode(blurhash, 8, 8);
  const placeholder = await sharp(Buffer.from(pixels), {
    raw: { width: 8, height: 8, channels: 4 },
  })
    .png()
    .toBuffer();

  return {
    blurhash,
    blurDataURL: `data:image/png;base64,${placeholder.toString("base64")}`,
  };
}
