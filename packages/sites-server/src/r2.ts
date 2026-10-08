import {
  DeleteObjectsCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { Effect, Option, Stream } from "effect";

import { R2_READ_TIMEOUT } from "./constants/r2";
import { getSitesR2Env } from "./env";
import { R2PreconditionFailedError } from "./errors";
import { R2DeleteFailedError } from "./schemas/r2";
import type { R2PutOptions, R2TextObject } from "./types/r2";
import { runSitesEffect } from "./utils/run-sites-effect";

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

function disposeBody(body: GetObjectCommandOutput["Body"]): void {
  try {
    if (body && "destroy" in body) {
      body.destroy();
    } else if (body && "cancel" in body && !body.locked) {
      void body.cancel().catch(() => undefined);
    }
  } catch {
    return;
  }
}

function listPages(prefix: string, delimiter?: string) {
  return Stream.paginate(
    undefined,
    Effect.fn("R2.listPage")(function* (continuationToken: string | undefined) {
      const page = yield* Effect.tryPromise({
        try: (abortSignal) =>
          getClient().send(
            new ListObjectsV2Command({
              Bucket: bucket(),
              Prefix: prefix,
              Delimiter: delimiter,
              ContinuationToken: continuationToken,
            }),
            { abortSignal }
          ),
        catch: (error) => error,
      });
      return [
        [page],
        page.IsTruncated && page.NextContinuationToken
          ? Option.some(page.NextContinuationToken)
          : Option.none(),
      ] as const;
    })
  );
}

export const r2GetTextEffect = Effect.fn("R2.getText")(function* (key: string) {
  return yield* Effect.acquireUseRelease(
    Effect.interruptible(
      Effect.tryPromise({
        try: (abortSignal) =>
          getClient()
            .send(new GetObjectCommand({ Bucket: bucket(), Key: key }), {
              abortSignal,
            })
            .then((result) => {
              if (abortSignal.aborted) {
                disposeBody(result.Body);
              }
              return result;
            }),
        catch: (error) => error,
      })
    ),
    (result) =>
      Effect.gen(function* () {
        const body = result.Body;
        if (!body) {
          return { text: "", etag: result.ETag ?? "" };
        }
        return yield* Effect.acquireUseRelease(
          Effect.try({
            try: () => body.transformToWebStream().getReader(),
            catch: (error) => error,
          }),
          (reader) =>
            Effect.gen(function* () {
              const decoder = new TextDecoder();
              let text = "";
              for (;;) {
                const chunk = yield* Effect.tryPromise({
                  try: () => reader.read(),
                  catch: (error) => error,
                });
                if (chunk.done) {
                  break;
                }
                text += decoder.decode(chunk.value, { stream: true });
              }
              return { text: text + decoder.decode(), etag: result.ETag ?? "" };
            }),
          (reader) =>
            Effect.sync(() => {
              void reader.cancel().catch(() => undefined);
              reader.releaseLock();
            })
        );
      }),
    (result) => Effect.sync(() => disposeBody(result.Body))
  ).pipe(
    Effect.timeout(R2_READ_TIMEOUT),
    Effect.catchIf(
      (error) =>
        statusOf(error) === 404 ||
        (error instanceof Error && error.name === "NoSuchKey"),
      () => Effect.succeed(null)
    )
  );
});

export function r2GetText(key: string): Promise<R2TextObject | null> {
  return runSitesEffect(r2GetTextEffect(key));
}

export const r2PutEffect = Effect.fn("R2.put")(function* (
  key: string,
  body: Uint8Array | string,
  options: R2PutOptions = {}
) {
  const result = yield* Effect.tryPromise({
    try: (abortSignal) =>
      getClient().send(
        new PutObjectCommand({
          Bucket: bucket(),
          Key: key,
          Body: body,
          ContentType: options.contentType,
          CacheControl: options.cacheControl,
          IfMatch: options.ifMatch,
          IfNoneMatch: options.ifNoneMatch,
        }),
        { abortSignal }
      ),
    catch: (error) =>
      statusOf(error) === 412
        ? new R2PreconditionFailedError(`Precondition failed for ${key}`)
        : error,
  });
  return result.ETag ?? "";
});

export function r2Put(
  key: string,
  body: Uint8Array | string,
  options: R2PutOptions = {}
): Promise<string> {
  return runSitesEffect(r2PutEffect(key, body, options));
}

const deleteKeys = Effect.fn("R2.deleteKeys")(function* (keys: string[]) {
  const result = yield* Effect.tryPromise({
    try: (abortSignal) =>
      getClient().send(
        new DeleteObjectsCommand({
          Bucket: bucket(),
          Delete: { Objects: keys.map((key) => ({ Key: key })), Quiet: true },
        }),
        { abortSignal }
      ),
    catch: (error) => error,
  });
  if (result.Errors?.length) {
    return yield* Effect.fail(
      new R2DeleteFailedError({
        failedCount: result.Errors.length,
        message: "R2 object deletion failed",
      })
    );
  }
});

const deletePrefix = Effect.fn("R2.deletePrefix")(function* (prefix: string) {
  return yield* listPages(prefix).pipe(
    Stream.mapEffect(
      Effect.fn("R2.deletePage")(function* (page) {
        const keys = (page.Contents ?? []).flatMap((object) =>
          object.Key ? [object.Key] : []
        );
        if (keys.length > 0) {
          yield* deleteKeys(keys);
        }
        return keys.length;
      }),
      { concurrency: 1 }
    ),
    Stream.runFold(
      () => 0,
      (deleted, count) => deleted + count
    )
  );
});

export function r2DeletePrefix(prefix: string): Promise<number> {
  return runSitesEffect(deletePrefix(prefix));
}

export function r2DeleteKey(key: string): Promise<void> {
  return runSitesEffect(deleteKeys([key]));
}

const listPrefixes = Effect.fn("R2.listPrefixes")(function* (prefix: string) {
  return yield* listPages(prefix, "/").pipe(
    Stream.runFold(
      () => new Array<string>(),
      (prefixes, page) => {
        for (const entry of page.CommonPrefixes ?? []) {
          if (entry.Prefix) {
            prefixes.push(entry.Prefix);
          }
        }
        return prefixes;
      }
    )
  );
});

export function r2ListPrefixes(prefix: string): Promise<string[]> {
  return runSitesEffect(listPrefixes(prefix));
}
