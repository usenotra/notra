import "server-only";
import convertHeic from "heic-convert";
import decodeHeic from "heic-decode";
import sharp from "sharp";

import {
  CONTENT_IMAGE_FALLBACK_MAX_EDGE,
  CONTENT_IMAGE_MIME_EXTENSIONS,
  type ContentImageMimeType,
  MAX_CONTENT_IMAGE_INPUT_BYTES,
} from "@/constants/content-image";
import { GITHUB_CONTENT_MAX_SINGLE_ASSET_BYTES } from "@/constants/github";
import type { HeicImageMetadata } from "@/types/content/heic-image";
import {
  contentImageCompressedTooLargeMessage,
  contentImageTooLargeMessage,
} from "@/utils/content-image-size";

const FORMAT_MIME = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const satisfies Record<string, ContentImageMimeType>;

const PIXEL_LIMIT = 40_000_000;

// Recognize HEIC by its container signature rather than trusting a browser-supplied filename or MIME type.
export function isHeic(bytes: Uint8Array) {
  return (
    bytes.byteLength >= 16 &&
    Buffer.from(bytes.subarray(4, 8)).toString("ascii") === "ftyp" &&
    /heic|heix|hevc|hevx/.test(
      Buffer.from(bytes.subarray(8, 32)).toString("ascii")
    )
  );
}

function mimeFromFormat(
  format: string | undefined
): ContentImageMimeType | null {
  if (!format) {
    return null;
  }
  return FORMAT_MIME[format as keyof typeof FORMAT_MIME] ?? null;
}

async function encode(
  bytes: Uint8Array,
  mimeType: ContentImageMimeType,
  maxEdge: number | null
) {
  let image = sharp(bytes, { limitInputPixels: PIXEL_LIMIT }).rotate();
  if (maxEdge) {
    image = image.resize({
      fit: "inside",
      height: maxEdge,
      width: maxEdge,
      withoutEnlargement: true,
    });
  }

  if (mimeType === "image/jpeg") {
    return image.jpeg({ mozjpeg: true, quality: 90 }).toBuffer();
  }
  if (mimeType === "image/png") {
    return image.png({ compressionLevel: 9, effort: 10 }).toBuffer();
  }
  // WebP stays lossless until the GitHub size cap forces a smaller encode.
  if (maxEdge) {
    return image.webp({ effort: 4, quality: 90 }).toBuffer();
  }
  return image.webp({ effort: 6, lossless: true }).toBuffer();
}

/** Convert Apple photos and optimize supported images for browser display and GitHub storage. */
export async function compressContentImage(bytes: Uint8Array): Promise<{
  bytes: Buffer;
  mimeType: ContentImageMimeType;
}> {
  if (bytes.byteLength > MAX_CONTENT_IMAGE_INPUT_BYTES) {
    throw new Error(contentImageTooLargeMessage("image/jpeg"));
  }

  let source: Uint8Array = bytes;
  if (isHeic(bytes)) {
    const images = (await decodeHeic.all({
      buffer: bytes,
    })) as unknown as HeicImageMetadata;
    try {
      const image = images[0];
      if (
        !image ||
        !Number.isSafeInteger(image.width) ||
        !Number.isSafeInteger(image.height) ||
        image.width <= 0 ||
        image.height <= 0 ||
        image.height > PIXEL_LIMIT / image.width
      ) {
        throw new Error("HEIC image exceeds the 40 megapixel limit");
      }
    } finally {
      images.dispose();
    }
    source = Buffer.from(
      await convertHeic({ buffer: bytes, format: "JPEG", quality: 0.9 })
    );
  }

  let metadata: Awaited<
    ReturnType<ReturnType<typeof sharp>["metadata"]>
  > | null = null;
  try {
    metadata = await sharp(source, {
      limitInputPixels: PIXEL_LIMIT,
    }).metadata();
  } catch {
    metadata = null;
  }
  const mimeType = mimeFromFormat(metadata?.format);
  if (!mimeType || !(mimeType in CONTENT_IMAGE_MIME_EXTENSIONS)) {
    throw new Error("Use a JPEG, PNG, GIF, WebP, AVIF, or HEIC image");
  }

  const passthrough =
    mimeType === "image/gif" ||
    mimeType === "image/avif" ||
    (metadata?.pages ?? 1) > 1;
  if (passthrough) {
    if (source.byteLength > GITHUB_CONTENT_MAX_SINGLE_ASSET_BYTES) {
      throw new Error(
        mimeType === "image/gif" || mimeType === "image/avif"
          ? contentImageTooLargeMessage(mimeType)
          : `Animated images must be ${GITHUB_CONTENT_MAX_SINGLE_ASSET_BYTES / (1024 * 1024)}MB or smaller`
      );
    }
    return { bytes: Buffer.from(source), mimeType };
  }

  const encoded = await encode(source, mimeType, null);
  // ponytail: keep the smaller file. A larger recompress can still hold EXIF.
  let chosen =
    encoded.byteLength < source.byteLength ? encoded : Buffer.from(source);
  if (chosen.byteLength <= GITHUB_CONTENT_MAX_SINGLE_ASSET_BYTES) {
    return { bytes: chosen, mimeType };
  }

  chosen = await encode(source, mimeType, CONTENT_IMAGE_FALLBACK_MAX_EDGE);
  if (chosen.byteLength > GITHUB_CONTENT_MAX_SINGLE_ASSET_BYTES) {
    throw new Error(contentImageCompressedTooLargeMessage());
  }
  return { bytes: chosen, mimeType };
}
