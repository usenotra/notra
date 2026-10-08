import { expect, test } from "bun:test";

import { Deferred, Effect, Fiber } from "effect";
import { FetchHttpClient } from "effect/http";
import { TestClock } from "effect/testing";

import {
  createCustomHostnameEffect,
  deleteCustomHostnameEffect,
  findCustomHostnameEffect,
  getCustomHostnameEffect,
} from "../src/cloudflare-saas";
import { CLOUDFLARE_REQUEST_TIMEOUT_MS } from "../src/constants/cloudflare-saas";
import { SiteProviderRequestError } from "../src/schemas/provider-error";
import { runSitesEffect } from "../src/utils/run-sites-effect";
import {
  cloudflareConfig,
  cloudflareHostname,
} from "./constants/provider-effect";

test("Cloudflare creates a decoded binding with one authenticated POST", async () => {
  let requests = 0;
  const program = createCustomHostnameEffect(
    cloudflareConfig,
    cloudflareHostname.hostname
  ).pipe(
    Effect.provideService(FetchHttpClient.Fetch, async (input, init) => {
      requests++;
      expect(String(input)).toEndWith("/synthetic-zone/custom_hostnames");
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("authorization")).toBe(
        `Bearer ${cloudflareConfig.apiToken}`
      );
      expect(JSON.parse(String(init?.body))).toEqual({
        hostname: cloudflareHostname.hostname,
        ssl: {
          method: "http",
          type: "dv",
          settings: { min_tls_version: "1.2" },
        },
      });
      return Response.json({ success: true, result: cloudflareHostname });
    })
  );
  expect(await runSitesEffect(program)).toEqual(cloudflareHostname);
  expect(requests).toBe(1);
});

test("Cloudflare accepts its documented optional status and ownership metadata", async () => {
  const result = await runSitesEffect(
    getCustomHostnameEffect(cloudflareConfig, cloudflareHostname.id).pipe(
      Effect.provideService(FetchHttpClient.Fetch, async () =>
        Response.json({
          success: true,
          result: {
            id: cloudflareHostname.id,
            hostname: cloudflareHostname.hostname,
            ownership_verification: { type: "txt" },
            ssl: { validation_errors: [{}] },
          },
        })
      )
    )
  );
  expect(result.status).toBe("pending");
  expect(result.ownership_verification).toEqual({ type: "txt" });
  expect(result.ssl?.validation_errors).toEqual([{ message: "" }]);
});

test("Cloudflare rejects HTTP status before reading a success payload and does not retry writes", async () => {
  let requests = 0;
  let reads = 0;
  let cancelled = false;
  const response = new Response(
    new ReadableStream(
      {
        pull() {
          reads++;
        },
        cancel() {
          cancelled = true;
          return new Promise<void>(() => {});
        },
      },
      { highWaterMark: 0 }
    ),
    { status: 403 }
  );
  await expect(
    runSitesEffect(
      createCustomHostnameEffect(
        cloudflareConfig,
        cloudflareHostname.hostname
      ).pipe(
        Effect.provideService(FetchHttpClient.Fetch, async () => {
          requests++;
          return response;
        })
      )
    )
  ).rejects.toMatchObject({
    provider: "cloudflare",
    operation: "createHostname",
    status: 403,
  });
  expect(requests).toBe(1);
  expect(reads).toBe(0);
  expect(cancelled).toBe(true);
});

test.each([
  "sensitive-invalid-json",
  JSON.stringify({ success: true, result: { ...cloudflareHostname, id: 42 } }),
  JSON.stringify({
    success: false,
    errors: [{ message: "sensitive-provider-detail" }],
  }),
])(
  "Cloudflare validates successful payloads without retaining private response details",
  async (body) => {
    try {
      await runSitesEffect(
        createCustomHostnameEffect(
          cloudflareConfig,
          cloudflareHostname.hostname
        ).pipe(
          Effect.provideService(
            FetchHttpClient.Fetch,
            async () => new Response(body)
          )
        )
      );
      throw new Error("Expected rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(SiteProviderRequestError);
      expect(JSON.stringify(error)).not.toContain("sensitive");
      expect(error).not.toHaveProperty("cause");
    }
  }
);

test("Cloudflare filters exact hostnames and accepts a delete response with no binding", async () => {
  const transport = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "DELETE") {
      expect(String(input)).toEndWith(
        "/custom_hostnames/id%2Fwith%3Fdelimiter"
      );
      return Response.json({ success: true, result: null });
    }
    return Response.json({
      success: true,
      result: [
        { ...cloudflareHostname, id: "other", hostname: "other.example.com" },
        cloudflareHostname,
      ],
    });
  };
  expect(
    await runSitesEffect(
      findCustomHostnameEffect(
        cloudflareConfig,
        cloudflareHostname.hostname
      ).pipe(Effect.provideService(FetchHttpClient.Fetch, transport))
    )
  ).toEqual(cloudflareHostname);
  await runSitesEffect(
    deleteCustomHostnameEffect(cloudflareConfig, "id/with?delimiter").pipe(
      Effect.provideService(FetchHttpClient.Fetch, transport)
    )
  );
});

test("Cloudflare deadlines abort a hung request without retrying it", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const started = yield* Deferred.make<void>();
      let signal: AbortSignal | null | undefined;
      let calls = 0;
      const fiber = yield* getCustomHostnameEffect(
        cloudflareConfig,
        cloudflareHostname.id
      ).pipe(
        Effect.provideService(FetchHttpClient.Fetch, async (_input, init) => {
          calls++;
          signal = init?.signal;
          Effect.runSync(Deferred.succeed(started, undefined));
          return await new Promise<Response>(() => {});
        }),
        Effect.forkChild
      );
      yield* Deferred.await(started);
      yield* TestClock.adjust(CLOUDFLARE_REQUEST_TIMEOUT_MS);
      const result = yield* Fiber.await(fiber);
      expect(result).toMatchObject({ _tag: "Failure" });
      expect(signal?.aborted).toBe(true);
      expect(calls).toBe(1);
    }).pipe(Effect.provide(TestClock.layer()))
  );
});

test("Cloudflare body deadlines release reader locks even when cancel acknowledgement never settles", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const reading = yield* Deferred.make<void>();
      let cancelled = false;
      let signal: AbortSignal | null | undefined;
      const stream = new ReadableStream<Uint8Array>(
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
      const fiber = yield* getCustomHostnameEffect(
        cloudflareConfig,
        cloudflareHostname.id
      ).pipe(
        Effect.provideService(FetchHttpClient.Fetch, async (_input, init) => {
          signal = init?.signal;
          return new Response(stream);
        }),
        Effect.forkChild
      );
      yield* Deferred.await(reading);
      yield* TestClock.adjust(CLOUDFLARE_REQUEST_TIMEOUT_MS);
      expect(yield* Fiber.await(fiber)).toMatchObject({ _tag: "Failure" });
      expect(signal?.aborted).toBe(true);
      expect(cancelled).toBe(true);
      expect(stream.locked).toBe(false);
    }).pipe(Effect.provide(TestClock.layer()))
  );
});
