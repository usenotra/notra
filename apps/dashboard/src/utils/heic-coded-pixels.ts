import { MAX_CONTENT_IMAGE_PIXELS } from "@/constants/content-image";

// Reject malformed HEIF metadata and oversized coded properties before libheif parses the image.
export function validateHeicCodedPixels(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let count = 0;
  let total = 0;

  // Visit only structured metadata containers, never compressed media payloads.
  function visit(start: number, end: number, depth: number) {
    if (depth > 3) {
      throw new Error("Invalid HEIC metadata");
    }
    let cursor = start;
    while (cursor + 8 <= end) {
      const size = view.getUint32(cursor);
      const type = String.fromCharCode(
        ...bytes.subarray(cursor + 4, cursor + 8)
      );
      if (size < 8 || size > end - cursor) {
        throw new Error("Invalid HEIC metadata");
      }
      const next = cursor + size;
      if (type === "meta" || type === "iprp" || type === "ipco") {
        if (type === "meta" && size < 12) {
          throw new Error("Invalid HEIC metadata");
        }
        visit(cursor + (type === "meta" ? 12 : 8), next, depth + 1);
      } else if (type === "ispe") {
        if (size < 20) {
          throw new Error("Invalid HEIC dimensions");
        }
        const width = view.getUint32(cursor + 12);
        const height = view.getUint32(cursor + 16);
        if (
          !width ||
          !height ||
          height > (MAX_CONTENT_IMAGE_PIXELS - total) / width
        ) {
          throw new Error("HEIC image exceeds the 40 megapixel limit");
        }
        total += width * height;
        count++;
      }
      cursor = next;
    }
    if (cursor !== end) {
      throw new Error("Invalid HEIC metadata");
    }
  }

  visit(0, bytes.byteLength, 0);
  if (!count) {
    throw new Error("Invalid HEIC dimensions");
  }
}
