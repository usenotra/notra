import "server-only";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

import {
  CONTENT_IMAGE_MIME_EXTENSIONS,
  CONTENT_IMAGE_ROUTE,
  type ContentImageMimeType,
} from "@/constants/content-image";
import {
  CONTENT_VIDEO_MIME_EXTENSIONS,
  type ContentVideoMimeType,
} from "@/constants/content-video";
import { getR2StorageConfig, isR2StorageConfigured } from "@/lib/upload/r2";
import { isSafeContentImageKey } from "@/utils/content-image-key";

const CONTENT_MEDIA_MIME_EXTENSIONS = {
  ...CONTENT_IMAGE_MIME_EXTENSIONS,
  ...CONTENT_VIDEO_MIME_EXTENSIONS,
} as const;

type ContentMediaMimeType = ContentImageMimeType | ContentVideoMimeType;

export interface StoredContentImage {
  bytes: Uint8Array;
  mimeType: ContentMediaMimeType;
}

function extensionForMime(mimeType: ContentMediaMimeType) {
  return CONTENT_MEDIA_MIME_EXTENSIONS[mimeType];
}

function mimeForKey(key: string): ContentMediaMimeType | null {
  const extension = key.split(".").pop()?.toLowerCase();
  for (const [mimeType, candidate] of Object.entries(
    CONTENT_MEDIA_MIME_EXTENSIONS
  )) {
    if (
      candidate === extension ||
      (candidate === "jpg" && extension === "jpeg")
    ) {
      return mimeType as ContentMediaMimeType;
    }
  }
  return null;
}

// ponytail: tmp dir when R2 is unset. Images vanish on reboot; set CLOUDFLARE_* to keep them.
function diskRoot() {
  return path.join(os.tmpdir(), "notra-content-images");
}

function diskPath(key: string) {
  if (!isSafeContentImageKey(key)) {
    throw new Error("Invalid content image key");
  }
  const resolved = path.resolve(diskRoot(), key);
  const root = path.resolve(diskRoot());
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid content image key");
  }
  return resolved;
}

async function writeDisk(key: string, bytes: Uint8Array) {
  const filePath = diskPath(key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
}

async function readDisk(
  key: string,
  maxBytes: number
): Promise<StoredContentImage | null> {
  const mimeType = mimeForKey(key);
  if (!mimeType) {
    return null;
  }
  let size: number;
  try {
    size = (await stat(diskPath(key))).size;
  } catch {
    return null;
  }
  if (size > maxBytes) {
    throw new Error(`Content file ${key} exceeds the size limit`);
  }
  const bytes = await readFile(diskPath(key));
  if (bytes.byteLength > maxBytes) {
    throw new Error(`Content file ${key} exceeds the size limit`);
  }
  return { bytes, mimeType };
}

async function writeR2(key: string, bytes: Uint8Array, mimeType: string) {
  const { bucketName, client } = getR2StorageConfig();
  await client.send(
    new PutObjectCommand({
      Body: bytes,
      Bucket: bucketName,
      CacheControl: "private, max-age=31536000, immutable",
      ContentLength: bytes.byteLength,
      ContentType: mimeType,
      Key: key,
    })
  );
}

async function readR2(
  key: string,
  maxBytes: number
): Promise<StoredContentImage | null> {
  const mimeType = mimeForKey(key);
  if (!mimeType) {
    return null;
  }
  const { bucketName, client } = getR2StorageConfig();
  const abortController = new AbortController();
  let response: GetObjectCommandOutput;
  try {
    response = await client.send(
      new GetObjectCommand({ Bucket: bucketName, Key: key }),
      { abortSignal: abortController.signal }
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "name" in error &&
      (error.name === "NoSuchKey" || error.name === "NotFound")
    ) {
      return null;
    }
    throw error;
  }
  if (
    response.ContentLength === undefined ||
    response.ContentLength > maxBytes
  ) {
    abortController.abort();
    throw new Error(`Content file ${key} exceeds the size limit`);
  }
  if (!response.Body) {
    abortController.abort();
    return null;
  }
  let bytes: Uint8Array;
  try {
    bytes = await response.Body.transformToByteArray();
  } catch (error) {
    abortController.abort();
    throw error;
  }
  if (bytes.byteLength > maxBytes) {
    abortController.abort();
    throw new Error(`Content file ${key} exceeds the size limit`);
  }
  return { bytes, mimeType };
}

export async function saveContentImage(params: {
  bytes: Uint8Array;
  mimeType: ContentMediaMimeType;
  organizationId: string;
}) {
  const key = `organization/${params.organizationId}/content/${nanoid()}.${extensionForMime(params.mimeType)}`;
  if (!isSafeContentImageKey(key)) {
    throw new Error("Invalid content image key");
  }

  if (isR2StorageConfigured()) {
    await writeR2(key, params.bytes, params.mimeType);
  } else {
    await writeDisk(key, params.bytes);
  }

  // ponytail: app URL only, so a draft is as private as the post. A public R2
  // bucket still serves a key that already leaked; use a private bucket then.
  return { key, url: `${CONTENT_IMAGE_ROUTE}/${key}` };
}

export async function readContentImage(key: string, maxBytes: number) {
  if (!isSafeContentImageKey(key)) {
    return null;
  }
  if (isR2StorageConfigured()) {
    return readR2(key, maxBytes);
  }
  return readDisk(key, maxBytes);
}
