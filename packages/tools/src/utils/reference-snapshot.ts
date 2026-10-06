import { createHash } from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { logError } from "@notra/ai/utils/server-log";

import {
  REFERENCE_SNAPSHOT_CONTENT_TYPE,
  REFERENCE_SNAPSHOT_STORAGE_PREFIX,
} from "../constants/reference-snapshot";
import type {
  ReferenceSnapshotDescriptor,
  ReferenceSnapshotStorageEnv,
  SaveReferenceSnapshotInput,
} from "../types/reference-snapshot";
import { getOrganizationId } from "./organization";
import { withTransientRetry } from "./retry";

const TRAILING_SLASHES_REGEX = /\/+$/;

let cachedClient: S3Client | undefined;
let cachedEnv: ReferenceSnapshotStorageEnv | undefined;

function normalizeEndpoint(endpoint: string, bucketName: string): string {
  const trimmed = endpoint.replace(TRAILING_SLASHES_REGEX, "");
  const bucketSuffix = `/${bucketName}`;
  return trimmed.endsWith(bucketSuffix)
    ? trimmed.slice(0, -bucketSuffix.length)
    : trimmed;
}

function getReferenceSnapshotStorageEnv(): ReferenceSnapshotStorageEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_BUCKET_NAME;
  const endpoint = process.env.CLOUDFLARE_S3_ENDPOINT;
  if (!(accessKeyId && secretAccessKey && bucketName && endpoint)) {
    throw new Error(
      "Reference snapshots require the Cloudflare R2 environment variables"
    );
  }

  cachedEnv = {
    accessKeyId,
    bucketName,
    endpoint: normalizeEndpoint(endpoint, bucketName),
    secretAccessKey,
  };
  return cachedEnv;
}

function getReferenceSnapshotClient(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getReferenceSnapshotStorageEnv();
  cachedClient = new S3Client({
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
    endpoint: env.endpoint,
    forcePathStyle: true,
    region: "auto",
  });
  return cachedClient;
}

export async function saveReferenceSnapshot({
  ctx,
  markdown,
}: SaveReferenceSnapshotInput): Promise<ReferenceSnapshotDescriptor | null> {
  const organizationId = getOrganizationId(ctx);
  const normalizedMarkdown = markdown.trim();
  if (!(organizationId && normalizedMarkdown)) {
    return null;
  }

  const body = Buffer.from(normalizedMarkdown, "utf8");
  const sourceContentHash = createHash("sha256").update(body).digest("hex");
  const sourceSnapshotKey = `${REFERENCE_SNAPSHOT_STORAGE_PREFIX}/${organizationId}/brand-references/snapshots/${sourceContentHash}.md`;
  const sourceCapturedAt = new Date().toISOString();
  try {
    const env = getReferenceSnapshotStorageEnv();
    await withTransientRetry(
      () =>
        getReferenceSnapshotClient().send(
          new PutObjectCommand({
            Body: body,
            Bucket: env.bucketName,
            CacheControl: "private, max-age=31536000, immutable",
            ContentLength: body.byteLength,
            ContentType: REFERENCE_SNAPSHOT_CONTENT_TYPE,
            Key: sourceSnapshotKey,
            Metadata: {
              capturedAt: sourceCapturedAt,
            },
          })
        ),
      {
        operationName: `R2 reference snapshot upload for ${sourceContentHash}`,
      }
    );
  } catch (error) {
    logError("Failed to persist reference snapshot", error, {
      organizationId,
      sourceContentHash,
    });
    return null;
  }

  return {
    sourceCapturedAt,
    sourceContentHash,
    sourceSnapshotKey,
  };
}
