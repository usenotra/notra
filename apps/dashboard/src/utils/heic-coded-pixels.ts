import { MAX_CONTENT_IMAGE_PIXELS } from "@/constants/content-image";

// Reject malformed HEIF metadata and oversized coded properties before libheif parses the image.
export function validateHeicCodedPixels(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let count = 0;

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
      let length = size;
      if (size === 0) {
        length = end - cursor;
      } else if (size === 1 && cursor + 16 <= end) {
        length = Number(view.getBigUint64(cursor + 8));
      }
      const headerSize = size === 1 ? 16 : 8;
      if (
        !Number.isSafeInteger(length) ||
        length < headerSize ||
        length > end - cursor
      ) {
        throw new Error("Invalid HEIC metadata");
      }
      const next = cursor + length;
      if (type === "meta" || type === "iprp" || type === "ipco") {
        if (type === "meta" && length < headerSize + 4) {
          throw new Error("Invalid HEIC metadata");
        }
        visit(cursor + headerSize + (type === "meta" ? 4 : 0), next, depth + 1);
      } else if (type === "ispe") {
        if (length < headerSize + 12) {
          throw new Error("Invalid HEIC dimensions");
        }
        const width = view.getUint32(cursor + headerSize + 4);
        const height = view.getUint32(cursor + headerSize + 8);
        if (!width || !height || height > MAX_CONTENT_IMAGE_PIXELS / width) {
          throw new Error("HEIC image exceeds the 40 megapixel limit");
        }
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
