import "server-only";
import libheif from "libheif-js/wasm-bundle";
import sharp from "sharp";

import {
  CONTENT_IMAGE_FALLBACK_MAX_EDGE,
  CONTENT_IMAGE_MIME_EXTENSIONS,
  type ContentImageMimeType,
  MAX_CONTENT_IMAGE_INPUT_BYTES,
  MAX_CONTENT_IMAGE_PIXELS,
} from "@/constants/content-image";
import { GITHUB_CONTENT_MAX_SINGLE_ASSET_BYTES } from "@/constants/github";
import type { HeicImage } from "@/types/content/heic-image";
import {
  contentImageCompressedTooLargeMessage,
  contentImageTooLargeMessage,
} from "@/utils/content-image-size";
import { validateHeicCodedPixels } from "@/utils/heic-coded-pixels";

const FORMAT_MIME = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const satisfies Record<string, ContentImageMimeType>;

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
  let image = sharp(bytes, {
    limitInputPixels: MAX_CONTENT_IMAGE_PIXELS,
  }).rotate();
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

// Decode only simple HEIC items within the aggregate pixel budget, releasing every handle even on errors.
async function decodeContentHeic(bytes: Uint8Array): Promise<Buffer> {
  validateHeicCodedPixels(bytes);
  const context = libheif.heif_context_alloc();
  if (!context) {
    throw new Error("Could not open HEIC image");
  }
  const handles: HeicImage[] = [];
  const images = new Map<number, HeicImage>();
  try {
    libheif.heif_context_set_maximum_image_size_limit(
      context,
      MAX_CONTENT_IMAGE_PIXELS
    );
    const parsed = libheif.heif_context_read_from_memory(context, bytes);
    if (parsed.code !== libheif.heif_error_code.heif_error_Ok) {
      throw new Error("Invalid HEIC image");
    }
    const ids = libheif.heif_context_get_list_of_item_IDs(context);
    const topLevel =
      libheif.heif_js_context_get_list_of_top_level_image_IDs(context);
    if (!ids.length || ids.length > 16 || !topLevel.length) {
      throw new Error("Unsupported HEIC image");
    }
    let total = 0;
    for (const id of ids) {
      const type = libheif.heif_item_get_item_type(context, id);
      if (type === "Exif" || type === "mime") {
        continue;
      }
      if (type !== "hvc1") {
        throw new Error("Unsupported HEIC image layout");
      }
      const image = new libheif.HeifImage(
        libheif.heif_js_context_get_image_handle(context, id)
      );
      handles.push(image);
      images.set(id, image);
      const width = image.get_width();
      const height = image.get_height();
      if (
        !width ||
        !height ||
        height > (MAX_CONTENT_IMAGE_PIXELS - total) / width
      ) {
        throw new Error("HEIC image exceeds the 40 megapixel limit");
      }
      total += width * height;
    }
    const primaryId = topLevel[0];
    const image = images.get(primaryId);
    if (!image) {
      throw new Error("Invalid HEIC image");
    }
    const width = image.get_width();
    const height = image.get_height();
    const raw = await new Promise<Uint8ClampedArray>((resolve, reject) => {
      image.display(
        { data: new Uint8ClampedArray(width * height * 4), width, height },
        (result) => {
          if (result) {
            resolve(result.data);
          } else {
            reject(new Error("Invalid HEIC pixels"));
          }
        }
      );
    });
    return sharp(raw, { raw: { width, height, channels: 4 } })
      .jpeg({ mozjpeg: true, quality: 90 })
      .toBuffer();
  } finally {
    try {
      for (const image of handles) {
        image.free();
      }
    } finally {
      libheif.heif_context_free(context);
    }
  }
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
    source = await decodeContentHeic(bytes);
  }

  let metadata: Awaited<
    ReturnType<ReturnType<typeof sharp>["metadata"]>
  > | null = null;
  try {
    metadata = await sharp(source, {
      limitInputPixels: MAX_CONTENT_IMAGE_PIXELS,
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
