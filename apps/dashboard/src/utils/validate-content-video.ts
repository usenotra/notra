import {
  MAX_CONTENT_VIDEO_BYTES,
  type ContentVideoMimeType,
} from "@/constants/content-video";

const MP4_BRANDS = new Set([
  "M4V ",
  "MSNV",
  "avc1",
  "dash",
  "iso2",
  "iso4",
  "iso5",
  "iso6",
  "isom",
  "mp41",
  "mp42",
]);

const EBML_ID = 0x1a45dfa3;
const EBML_DOCTYPE_ID = 0x4282;
const WEBM_DOCTYPE = "webm";

function readEbmlVint(bytes: Uint8Array, offset: number) {
  const first = bytes[offset];
  if (first === undefined || first === 0) {
    return null;
  }
  let width = 1;
  let mask = 0x80;
  while (width <= 8 && (first & mask) === 0) {
    width += 1;
    mask >>= 1;
  }
  if (width > 8 || offset + width > bytes.length) {
    return null;
  }
  let value = first & (mask - 1);
  for (let index = 1; index < width; index++) {
    const next = bytes[offset + index];
    if (next === undefined) {
      return null;
    }
    value = value * 256 + next;
  }
  if (value > bytes.length - (offset + width)) {
    return null;
  }
  return { value, width };
}

function readEbmlId(bytes: Uint8Array, offset: number) {
  const first = bytes[offset];
  if (first === undefined || first === 0) {
    return null;
  }
  let width = 1;
  let mask = 0x80;
  while (width <= 8 && (first & mask) === 0) {
    width += 1;
    mask >>= 1;
  }
  if (offset + width > bytes.length) {
    return null;
  }
  let id = 0;
  for (let index = 0; index < width; index++) {
    const next = bytes[offset + index];
    if (next === undefined) {
      return null;
    }
    id = (id << 8) | next;
  }
  return { id, width };
}

function ebmlDocType(bytes: Uint8Array) {
  const header = readEbmlId(bytes, 0);
  if (header?.id !== EBML_ID) {
    return null;
  }
  const size = readEbmlVint(bytes, header.width);
  if (!size) {
    return null;
  }
  let offset = header.width + size.width;
  const end = offset + size.value;
  if (end > bytes.length) {
    return null;
  }
  while (offset < end) {
    const id = readEbmlId(bytes, offset);
    const payloadSize = id ? readEbmlVint(bytes, offset + id.width) : null;
    if (!(id && payloadSize)) {
      return null;
    }
    const dataStart = offset + id.width + payloadSize.width;
    const dataEnd = dataStart + payloadSize.value;
    if (dataEnd > end) {
      return null;
    }
    if (id.id === EBML_DOCTYPE_ID) {
      return String.fromCharCode(...bytes.subarray(dataStart, dataEnd));
    }
    offset = dataEnd;
  }
  return null;
}

function isWebm(bytes: Uint8Array) {
  return ebmlDocType(bytes) === WEBM_DOCTYPE;
}

function isMp4(bytes: Uint8Array) {
  if (
    bytes.length < 12 ||
    bytes[4] !== 0x66 ||
    bytes[5] !== 0x74 ||
    bytes[6] !== 0x79 ||
    bytes[7] !== 0x70
  ) {
    return false;
  }
  const brand = String.fromCharCode(
    bytes[8] ?? 0,
    bytes[9] ?? 0,
    bytes[10] ?? 0,
    bytes[11] ?? 0
  );
  return MP4_BRANDS.has(brand);
}

function videoTooLargeMessage() {
  return `Video must be ${MAX_CONTENT_VIDEO_BYTES / (1024 * 1024)}MB or smaller`;
}

// ponytail: no ffmpeg. A GitHub draft already rejects files over 10MB, so transcoding would not admit a larger clip.
export function validateContentVideo(bytes: Uint8Array): ContentVideoMimeType {
  if (bytes.byteLength > MAX_CONTENT_VIDEO_BYTES) {
    throw new Error(videoTooLargeMessage());
  }
  if (isMp4(bytes)) {
    return "video/mp4";
  }
  if (isWebm(bytes)) {
    return "video/webm";
  }
  throw new Error("Use an MP4 or WebM video");
}
