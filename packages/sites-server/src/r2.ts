import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

import { getSitesR2Env } from "./env";

let client: S3Client | undefined;

function getClient(): S3Client {
  if (!client) {
    const env = getSitesR2Env();
    client = new S3Client({
      region: "auto",
      endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }
  return client;
}

function bucket(): string {
  return getSitesR2Env().bucket;
}

function statusOf(error: unknown): number | undefined {
  return error instanceof S3ServiceException
    ? error.$metadata.httpStatusCode
    : undefined;
}

export class R2PreconditionFailedError extends Error {
  readonly name = "R2PreconditionFailedError";
}

export async function r2GetText(
  key: string
): Promise<{ text: string; etag: string } | null> {
  try {
    const result = await getClient().send(
      new GetObjectCommand({ Bucket: bucket(), Key: key })
    );
    const text = (await result.Body?.transformToString()) ?? "";
    return { text, etag: result.ETag ?? "" };
  } catch (error) {
    if (
      statusOf(error) === 404 ||
      (error as { name?: string }).name === "NoSuchKey"
    ) {
      return null;
    }
    throw error;
  }
}

export async function r2GetBytes(key: string): Promise<Uint8Array | null> {
  try {
    const result = await getClient().send(
      new GetObjectCommand({ Bucket: bucket(), Key: key })
    );
    return (await result.Body?.transformToByteArray()) ?? new Uint8Array();
  } catch (error) {
    if (
      statusOf(error) === 404 ||
      (error as { name?: string }).name === "NoSuchKey"
    ) {
      return null;
    }
    throw error;
  }
}

export async function r2Put(
  key: string,
  body: Uint8Array | string,
  options: {
    contentType?: string;
    cacheControl?: string;
    /** `"*"` = create only; an ETag = compare-and-swap. */
    ifMatch?: string;
    ifNoneMatch?: "*";
  } = {}
): Promise<string> {
  try {
    const result = await getClient().send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: body,
        ContentType: options.contentType,
        CacheControl: options.cacheControl,
        IfMatch: options.ifMatch,
        IfNoneMatch: options.ifNoneMatch,
      })
    );
    return result.ETag ?? "";
  } catch (error) {
    if (statusOf(error) === 412) {
      throw new R2PreconditionFailedError(`Precondition failed for ${key}`);
    }
    throw error;
  }
}

export async function r2DeletePrefix(prefix: string): Promise<number> {
  let deleted = 0;
  let continuationToken: string | undefined;
  do {
    const page = await getClient().send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    const keys = (page.Contents ?? []).flatMap((object) =>
      object.Key ? [{ Key: object.Key }] : []
    );
    if (keys.length > 0) {
      await getClient().send(
        new DeleteObjectsCommand({
          Bucket: bucket(),
          Delete: { Objects: keys, Quiet: true },
        })
      );
      deleted += keys.length;
    }
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);
  return deleted;
}

export async function r2DeleteKey(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectsCommand({
      Bucket: bucket(),
      Delete: { Objects: [{ Key: key }], Quiet: true },
    })
  );
}

export async function r2ListPrefixes(prefix: string): Promise<string[]> {
  const prefixes: string[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await getClient().send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        Prefix: prefix,
        Delimiter: "/",
        ContinuationToken: continuationToken,
      })
    );
    for (const entry of page.CommonPrefixes ?? []) {
      if (entry.Prefix) {
        prefixes.push(entry.Prefix);
      }
    }
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);
  return prefixes;
}
