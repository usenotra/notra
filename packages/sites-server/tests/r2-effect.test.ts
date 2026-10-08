import {
  afterAll,
  afterEach,
  beforeEach,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { Deferred, Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";

import { R2PreconditionFailedError } from "../src/errors";
import {
  r2DeleteKey,
  r2DeletePrefix,
  r2GetText,
  r2GetTextEffect,
  r2ListPrefixes,
  r2Put,
  r2PutEffect,
} from "../src/r2";
import { R2DeleteFailedError } from "../src/schemas/r2";

const send =
  mock<
    (
      command:
        | GetObjectCommand
        | PutObjectCommand
        | DeleteObjectsCommand
        | ListObjectsV2Command,
      options: unknown
    ) => Promise<unknown>
  >();
const sdkSend = spyOn(S3Client.prototype, "send").mockImplementation(
  (command, options) => {
    if (
      command instanceof GetObjectCommand ||
      command instanceof PutObjectCommand ||
      command instanceof DeleteObjectsCommand ||
      command instanceof ListObjectsV2Command
    ) {
      return send(command, options);
    }
    throw new Error("Unexpected SDK command");
  }
);
const savedEnv = { ...process.env };

beforeEach(() => {
  process.env.SITES_R2_ACCOUNT_ID = "test";
  process.env.SITES_R2_ACCESS_KEY_ID = "test";
  process.env.SITES_R2_SECRET_ACCESS_KEY = "test";
  process.env.SITES_R2_BUCKET = "test-bucket";
  send.mockReset();
});

afterEach(() => {
  process.env = { ...savedEnv };
});

afterAll(() => {
  sdkSend.mockRestore();
});

test("R2 preserves missing objects, conditional failures, and raw SDK error identity", async () => {
  const missing = new S3ServiceException({
    name: "NotFound",
    $fault: "client",
    $metadata: { httpStatusCode: 404 },
  });
  send.mockRejectedValueOnce(missing);
  expect(await r2GetText("missing")).toBeNull();
  send.mockRejectedValueOnce(
    Object.assign(new Error("missing"), { name: "NoSuchKey" })
  );
  expect(await r2GetText("missing")).toBeNull();
  const conflict = new S3ServiceException({
    name: "PreconditionFailed",
    $fault: "client",
    $metadata: { httpStatusCode: 412 },
  });
  send.mockRejectedValueOnce(conflict);
  await expect(r2Put("key", "body")).rejects.toBeInstanceOf(
    R2PreconditionFailedError
  );
  send.mockRejectedValueOnce(conflict);
  expect(
    await Effect.runPromise(Effect.result(r2PutEffect("key", "body")))
  ).toMatchObject({
    _tag: "Failure",
    failure: expect.any(R2PreconditionFailedError),
  });
  const error = new Error("SDK failure");
  for (const operation of [
    () => r2GetText("key"),
    () => r2Put("key", "body"),
    () => r2DeleteKey("key"),
    () => r2ListPrefixes("prefix/"),
  ]) {
    send.mockRejectedValueOnce(error);
    await expect(operation()).rejects.toBe(error);
  }
  expect(send).toHaveBeenCalledTimes(8);
});

test("R2 preserves put conditionals and supplies the runtime abort signal", async () => {
  send.mockResolvedValueOnce({ ETag: "etag" });
  expect(
    await r2Put("key", "body", {
      ifMatch: "old",
      ifNoneMatch: "*",
      contentType: "text/plain",
      cacheControl: "no-cache",
    })
  ).toBe("etag");
  const [command, options] = send.mock.calls[0] ?? [];
  expect(command).toBeInstanceOf(PutObjectCommand);
  if (!(command instanceof PutObjectCommand)) {
    throw new Error("Expected PutObjectCommand");
  }
  expect(command.input).toEqual({
    Bucket: "test-bucket",
    Key: "key",
    Body: "body",
    ContentType: "text/plain",
    CacheControl: "no-cache",
    IfMatch: "old",
    IfNoneMatch: "*",
  });
  expect(options).toEqual({ abortSignal: expect.any(AbortSignal) });
});

test("R2 paginates prefixes with delimiters and deletes pages sequentially in order", async () => {
  send.mockResolvedValueOnce({
    CommonPrefixes: [{ Prefix: "p/a/" }, {}],
    IsTruncated: true,
    NextContinuationToken: "next",
  });
  send.mockResolvedValueOnce({
    CommonPrefixes: [{ Prefix: "p/b/" }],
    IsTruncated: false,
  });
  expect(await r2ListPrefixes("p/")).toEqual(["p/a/", "p/b/"]);
  expect(send.mock.calls[0]?.[0].input).toEqual({
    Bucket: "test-bucket",
    Prefix: "p/",
    Delimiter: "/",
    ContinuationToken: undefined,
  });
  expect(send.mock.calls[1]?.[0].input).toMatchObject({
    ContinuationToken: "next",
  });
  send.mockReset();
  send.mockResolvedValueOnce({
    Contents: [{ Key: "p/a" }, {}, { Key: "p/b" }],
    IsTruncated: true,
    NextContinuationToken: "next",
  });
  send.mockResolvedValueOnce({});
  send.mockResolvedValueOnce({
    Contents: [{ Key: "p/c" }],
    IsTruncated: false,
  });
  send.mockResolvedValueOnce({});
  expect(await r2DeletePrefix("p/")).toBe(3);
  expect(send.mock.calls.map(([command]) => command.constructor)).toEqual([
    ListObjectsV2Command,
    DeleteObjectsCommand,
    ListObjectsV2Command,
    DeleteObjectsCommand,
  ]);
  expect(send.mock.calls[1]?.[0].input).toMatchObject({
    Delete: {
      Objects: [{ Key: "p/a" }, { Key: "p/b" }],
      Quiet: true,
    },
  });
  expect(send.mock.calls[0]?.[0].input).toMatchObject({ Delimiter: undefined });
});

test("R2 reads split UTF-8 and destroys the body after success and read failure", async () => {
  let destroyed = 0;
  const bytes = new TextEncoder().encode("héllo");
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.subarray(0, 2));
      controller.enqueue(bytes.subarray(2));
      controller.close();
    },
  });
  send.mockResolvedValueOnce({
    Body: {
      transformToWebStream: () => stream,
      destroy: () => {
        destroyed++;
      },
    },
    ETag: "etag",
  });
  expect(await r2GetText("key")).toEqual({ text: "héllo", etag: "etag" });
  expect(stream.locked).toBe(false);
  const error = new Error("body failed");
  const broken = new ReadableStream({
    start(controller) {
      controller.error(error);
    },
  });
  send.mockResolvedValueOnce({
    Body: {
      transformToWebStream: () => broken,
      destroy: () => {
        destroyed++;
      },
    },
  });
  await expect(r2GetText("key")).rejects.toBe(error);
  expect(broken.locked).toBe(false);
  expect(destroyed).toBe(2);
});

test("R2 does not request the next page until the current delete finishes", async () => {
  const deleting = Deferred.makeUnsafe<void>();
  const resume = Deferred.makeUnsafe<void>();
  send.mockResolvedValueOnce({
    Contents: [{ Key: "p/a" }],
    IsTruncated: true,
    NextContinuationToken: "next",
  });
  send.mockImplementationOnce(() => {
    Effect.runSync(Deferred.succeed(deleting, undefined));
    return Effect.runPromise(Deferred.await(resume)).then(() => ({}));
  });
  send.mockResolvedValueOnce({ Contents: [], IsTruncated: false });
  const result = r2DeletePrefix("p/");
  await Effect.runPromise(Deferred.await(deleting));
  expect(send).toHaveBeenCalledTimes(2);
  Effect.runSync(Deferred.succeed(resume, undefined));
  expect(await result).toBe(1);
  expect(send).toHaveBeenCalledTimes(3);
});

test("R2 stops after a failed delete without retries or later pages", async () => {
  const error = new Error("ambiguous delete");
  send.mockResolvedValueOnce({
    Contents: [{ Key: "p/a" }],
    IsTruncated: true,
    NextContinuationToken: "next",
  });
  send.mockRejectedValueOnce(error);
  await expect(r2DeletePrefix("p/")).rejects.toBe(error);
  expect(send).toHaveBeenCalledTimes(2);
});

test("R2 rejects partial delete failures without a false count or next page", async () => {
  send.mockResolvedValueOnce({
    Contents: [{ Key: "private/first" }, { Key: "private/second" }],
    IsTruncated: true,
    NextContinuationToken: "next",
  });
  send.mockResolvedValueOnce({
    Errors: [
      {
        Key: "private/second",
        Code: "AccessDenied",
        Message: "private provider details",
      },
    ],
  });
  await r2DeletePrefix("private/").then(
    () => {
      throw new Error("Partial deletion must not return a successful count");
    },
    (error: unknown) => {
      expect(error).toBeInstanceOf(R2DeleteFailedError);
      if (!(error instanceof R2DeleteFailedError)) {
        throw error;
      }
      expect(error.failedCount).toBe(1);
      expect(error.message).toBe("R2 object deletion failed");
      expect(JSON.stringify(error)).not.toContain("private");
      expect(JSON.stringify(error)).not.toContain("AccessDenied");
    }
  );
  expect(send).toHaveBeenCalledTimes(2);
});

test("R2 timeout aborts an unresponsive SDK send without hanging", async () => {
  let aborted = false;
  await Effect.runPromise(
    Effect.gen(function* () {
      const started = yield* Deferred.make<void>();
      send.mockImplementationOnce((_command, options) => {
        if (
          typeof options !== "object" ||
          options === null ||
          !("abortSignal" in options) ||
          !(options.abortSignal instanceof AbortSignal)
        ) {
          throw new Error("Expected abort signal");
        }
        options.abortSignal.addEventListener("abort", () => {
          aborted = true;
        });
        Effect.runSync(Deferred.succeed(started, undefined));
        return new Promise(() => {});
      });
      const fiber = yield* r2GetTextEffect("key").pipe(Effect.forkChild);
      yield* Deferred.await(started);
      yield* TestClock.adjust("30 seconds");
      const result = yield* Fiber.await(fiber);
      expect(result._tag).toBe("Failure");
      expect(aborted).toBe(true);
    }).pipe(Effect.provide(TestClock.layer()))
  );
});

test("interrupted R2 GET disposes a body delivered after the acquisition was interrupted", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const started = yield* Deferred.make<void>();
      const deliver = yield* Deferred.make<void>();
      const destroyed = yield* Deferred.make<void>();
      let aborted = false;
      send.mockImplementationOnce((_command, options) => {
        if (
          typeof options !== "object" ||
          options === null ||
          !("abortSignal" in options) ||
          !(options.abortSignal instanceof AbortSignal)
        ) {
          throw new Error("Expected abort signal");
        }
        options.abortSignal.addEventListener("abort", () => {
          aborted = true;
        });
        Effect.runSync(Deferred.succeed(started, undefined));
        return Effect.runPromise(Deferred.await(deliver)).then(() => ({
          Body: {
            destroy() {
              Effect.runSync(Deferred.succeed(destroyed, undefined));
            },
            transformToWebStream() {
              throw new Error("Late body must not be consumed");
            },
          },
        }));
      });
      const fiber = yield* r2GetTextEffect("key").pipe(Effect.forkChild);
      yield* Deferred.await(started);
      yield* Fiber.interrupt(fiber);
      expect(aborted).toBe(true);
      yield* Deferred.succeed(deliver, undefined);
      yield* Deferred.await(destroyed);
      expect(send).toHaveBeenCalledTimes(1);
    })
  );
});

test("R2 timeout owns a stalled body and does not wait for cancel acknowledgement", async () => {
  let cancelled = false;
  let destroyed = false;
  await Effect.runPromise(
    Effect.gen(function* () {
      const reading = yield* Deferred.make<void>();
      const stream = new ReadableStream(
        {
          pull() {
            Effect.runSync(Deferred.succeed(reading, undefined));
          },
          cancel() {
            cancelled = true;
            return new Promise<void>(() => {});
          },
        },
        { highWaterMark: 0 }
      );
      send.mockResolvedValueOnce({
        Body: {
          transformToWebStream: () => stream,
          destroy: () => {
            destroyed = true;
          },
        },
      });
      const fiber = yield* r2GetTextEffect("key").pipe(Effect.forkChild);
      yield* Deferred.await(reading);
      yield* TestClock.adjust("30 seconds");
      const result = yield* Fiber.await(fiber);
      expect(result._tag).toBe("Failure");
      expect(cancelled).toBe(true);
      expect(destroyed).toBe(true);
      expect(stream.locked).toBe(false);
    }).pipe(Effect.provide(TestClock.layer()))
  );
});
