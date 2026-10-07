import { gunzipSync } from "node:zlib";

import { TAR_BLOCK_SIZE } from "./constants/build";
import { UnsafeArchiveError } from "./errors";
import type { ArchiveFile, ArchiveLimits } from "./types/tar";

const decoder = new TextDecoder();

function readString(block: Uint8Array, offset: number, length: number): string {
  const slice = block.subarray(offset, offset + length);
  const end = slice.indexOf(0);
  return decoder.decode(end === -1 ? slice : slice.subarray(0, end));
}

function readOctal(block: Uint8Array, offset: number, length: number): number {
  const text = readString(block, offset, length).trim();
  return text ? Number.parseInt(text, 8) : 0;
}

function parsePax(data: Uint8Array): Record<string, string> {
  const records: Record<string, string> = {};
  let offset = 0;
  while (offset < data.length) {
    const space = data.indexOf(32, offset);
    const length = Number(decoder.decode(data.subarray(offset, space)));
    const end = offset + length;
    if (
      space < offset ||
      !Number.isSafeInteger(length) ||
      length <= space - offset + 1 ||
      end > data.length ||
      data[end - 1] !== 10
    ) {
      throw new UnsafeArchiveError("Invalid PAX record");
    }
    const record = decoder.decode(data.subarray(space + 1, end - 1));
    const equals = record.indexOf("=");
    if (equals <= 0) {
      throw new UnsafeArchiveError("Invalid PAX record");
    }
    records[record.slice(0, equals)] = record.slice(equals + 1);
    offset = end;
  }
  return records;
}

function normalizeArchivePath(raw: string): string | null {
  const segments: string[] = [];
  for (const segment of raw.split("/")) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      return null;
    }
    segments.push(segment);
  }
  return segments.join("/");
}

export function readTarGz(
  archive: Uint8Array,
  limits: ArchiveLimits
): ArchiveFile[] {
  const tar = gunzipSync(archive, {
    maxOutputLength:
      limits.maxBytes +
      limits.maxFiles * TAR_BLOCK_SIZE * 2 +
      TAR_BLOCK_SIZE * 4,
  });
  const files: ArchiveFile[] = [];
  let offset = 0;
  let totalBytes = 0;
  let longName: string | null = null;
  let paxPath: string | null = null;

  while (offset + TAR_BLOCK_SIZE <= tar.length) {
    const header = tar.subarray(offset, offset + TAR_BLOCK_SIZE);
    if (header.every((byte) => byte === 0)) {
      break;
    }
    const size = readOctal(header, 124, 12);
    if (
      !Number.isSafeInteger(size) ||
      size < 0 ||
      offset + TAR_BLOCK_SIZE + size > tar.length
    ) {
      throw new UnsafeArchiveError("Invalid archive entry size");
    }
    const type = String.fromCharCode(header[156] ?? 48);
    const dataStart = offset + TAR_BLOCK_SIZE;
    const data = tar.subarray(dataStart, dataStart + size);
    offset = dataStart + Math.ceil(size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;

    if (type === "L") {
      longName = readString(data, 0, data.length);
      continue;
    }
    if (type === "x") {
      paxPath = parsePax(data).path ?? null;
      continue;
    }
    if (type === "g") {
      continue;
    }
    const prefix = readString(header, 345, 155);
    const name = readString(header, 0, 100);
    const rawPath =
      paxPath ?? longName ?? (prefix ? `${prefix}/${name}` : name);
    longName = null;
    paxPath = null;

    if (type === "5") {
      continue;
    }
    if (type !== "0" && type !== "\0" && type !== "7") {
      throw new UnsafeArchiveError(
        `Archive entry ${rawPath} is not a regular file (type ${type})`
      );
    }
    const path = normalizeArchivePath(rawPath);
    if (path === null || path === "") {
      throw new UnsafeArchiveError(
        `Archive entry ${rawPath} escapes the output directory`
      );
    }
    if (size > limits.maxFileBytes) {
      throw new UnsafeArchiveError(`${path} is larger than the per-file limit`);
    }
    totalBytes += size;
    if (files.length + 1 > limits.maxFiles || totalBytes > limits.maxBytes) {
      throw new UnsafeArchiveError(
        "Build output exceeds the size or file count limit"
      );
    }
    files.push({ path, data: new Uint8Array(data) });
  }
  return files;
}
