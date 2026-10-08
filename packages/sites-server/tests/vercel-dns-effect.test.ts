import { expect, test } from "bun:test";

import { Deferred, Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";

import { SiteProviderRequestError } from "../src/schemas/provider-error";
import {
  applyVercelDnsRecords,
  applyVercelDnsRecordsEffect,
  exchangeVercelCode,
  exchangeVercelCodeEffect,
  findVercelZone,
  findVercelZoneEffect,
  removeVercelInstallation,
} from "../src/vercel-dns";

const config = {
  slug: "synthetic",
  clientId: "client",
  clientSecret: "secret",
};
const grant = {
  accessToken: "token",
  teamId: "team/a",
  configurationId: "install/a",
};

test("OAuth decodes valid tokens and preserves the form callback", async () => {
  const result = await exchangeVercelCode(config, "code", {
    fetch: async (_input, init) => {
      expect(init?.method).toBe("POST");
      const form = new URLSearchParams(String(init?.body));
      expect(form.get("client_secret")).toBe("secret");
      expect(form.get("code")).toBe("code");
      expect(form.get("redirect_uri")?.endsWith("/sites/vercel-dns")).toBe(
        true
      );
      return Response.json({
        access_token: "token",
        installation_id: "install",
      });
    },
  });
  expect(result).toEqual({
    accessToken: "token",
    configurationId: "install",
    teamId: null,
  });
});

test("OAuth rejects invalid successful JSON without retaining provider payloads", async () => {
  for (const body of [
    '{"access_token":42,"installation_id":"secret"}',
    "secret-not-json",
    "{}",
  ]) {
    try {
      await exchangeVercelCode(config, "code", {
        fetch: async () => new Response(body),
      });
      throw new Error("Expected decoding failure");
    } catch (error) {
      expect(error).toBeInstanceOf(SiteProviderRequestError);
      expect(error).toMatchObject({
        provider: "vercel",
        operation: "exchange",
        status: 200,
      });
      expect(JSON.stringify(error)).not.toContain("secret");
      expect(error).not.toHaveProperty("cause");
    }
  }
});

test("OAuth classifies rejected status without reading the successful payload", async () => {
  let reads = 0;
  let cancelled = false;
  const response = new Response(
    new ReadableStream(
      {
        pull() {
          reads += 1;
        },
        cancel() {
          cancelled = true;
        },
      },
      { highWaterMark: 0 }
    ),
    { status: 401 }
  );
  await expect(
    exchangeVercelCode(config, "code", { fetch: async () => response })
  ).rejects.toMatchObject({ operation: "exchange", status: 401 });
  expect(reads).toBe(0);
  expect(cancelled).toBe(true);
});

test("records are sequential, retain TXT and team scope, and accept conflicts", async () => {
  const seen: unknown[] = [];
  let cleanupCount = 0;
  await applyVercelDnsRecords({
    grant,
    zone: "example.com",
    records: [
      {
        type: "TXT",
        name: "_proof.example.com",
        value: "verification=text",
        purpose: "ownership",
      },
      {
        type: "CNAME",
        name: "blog.example.com",
        value: "target.example.com",
        purpose: "routing",
      },
    ],
    deps: {
      fetch: async (input, init) => {
        expect(cleanupCount).toBe(seen.length);
        expect(String(input)).toContain("?teamId=team%2Fa");
        expect(init?.method).toBe("POST");
        seen.push(JSON.parse(String(init?.body)));
        return new Response(
          new ReadableStream({
            cancel() {
              cleanupCount += 1;
            },
          }),
          {
            status: seen.length === 1 ? 409 : 201,
          }
        );
      },
    },
  });
  expect(seen).toEqual([
    {
      type: "TXT",
      name: "_proof",
      value: "verification=text",
      ttl: 60,
      comment: "Notra Sites",
    },
    {
      type: "CNAME",
      name: "blog",
      value: "target.example.com",
      ttl: 60,
      comment: "Notra Sites",
    },
  ]);
  expect(cleanupCount).toBe(2);
});

test("a rejected mutation is never retried and prevents later records", async () => {
  let calls = 0;
  await expect(
    applyVercelDnsRecords({
      grant,
      zone: "example.com",
      records: [
        {
          type: "A",
          name: "example.com",
          value: "192.0.2.1",
          purpose: "routing",
        },
        {
          type: "TXT",
          name: "example.com",
          value: "proof",
          purpose: "ownership",
        },
      ],
      deps: {
        fetch: async () => {
          calls += 1;
          return new Response("secret", { status: 503 });
        },
      },
    })
  ).rejects.toMatchObject({ operation: "apply", status: 503 });
  expect(calls).toBe(1);
});

test("DNS lookup failures continue parent discovery", async () => {
  const zones: string[] = [];
  expect(
    await findVercelZone("docs.blog.example.com", {
      resolveNs: async (zone) => {
        zones.push(zone);
        if (zone === "blog.example.com") {
          throw new Error("lookup failed");
        }
        return ["ns1.vercel-dns.com."];
      },
    })
  ).toBe("example.com");
  expect(zones).toEqual(["blog.example.com", "example.com"]);
});

test("a hung DNS candidate is cancelled at its two-attempt deadline before continuing", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const started = yield* Deferred.make<void>();
      let firstSignal: AbortSignal | undefined;
      const zones: string[] = [];
      const fiber = yield* findVercelZoneEffect("docs.blog.example.com", {
        resolveNs: (zone, signal) => {
          zones.push(zone);
          if (zone === "blog.example.com") {
            firstSignal = signal;
            Effect.runSync(Deferred.succeed(started, undefined));
            return new Promise<string[]>(() => undefined);
          }
          expect(firstSignal?.aborted).toBe(true);
          expect(signal?.aborted).toBe(false);
          return Promise.resolve(["ns1.vercel-dns.com"]);
        },
      }).pipe(Effect.forkChild);
      yield* Deferred.await(started);
      yield* TestClock.adjust(5999);
      expect(firstSignal?.aborted).toBe(false);
      expect(zones).toEqual(["blog.example.com"]);
      yield* TestClock.adjust(1);
      expect(yield* Fiber.join(fiber)).toBe("example.com");
      expect(zones).toEqual(["blog.example.com", "example.com"]);
    }).pipe(Effect.provide(TestClock.layer()))
  );
});

test("interrupting DNS aborts the current lookup without starting another candidate", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const started = yield* Deferred.make<void>();
      let signal: AbortSignal | undefined;
      let calls = 0;
      const fiber = yield* findVercelZoneEffect("docs.blog.example.com", {
        resolveNs: (_zone, lookupSignal) => {
          calls += 1;
          signal = lookupSignal;
          Effect.runSync(Deferred.succeed(started, undefined));
          return new Promise<string[]>(() => undefined);
        },
      }).pipe(Effect.forkChild);
      yield* Deferred.await(started);
      yield* Fiber.interrupt(fiber);
      expect(signal?.aborted).toBe(true);
      expect(calls).toBe(1);
    })
  );
});

test("uninstall retains best-effort status and transport failure policy", async () => {
  await removeVercelInstallation(grant, {
    fetch: async (input, init) => {
      expect(String(input)).toContain("install%2Fa?teamId=team%2Fa");
      expect(init?.method).toBe("DELETE");
      return new Response("secret", { status: 500 });
    },
  });
  await removeVercelInstallation(grant, {
    fetch: async () => {
      throw new Error("secret");
    },
  });
});

test("Effect cancellation aborts the injected transport without retry", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const ready = yield* Deferred.make<void>();
      let signal: AbortSignal | undefined;
      let calls = 0;
      const fiber = yield* exchangeVercelCodeEffect(config, "code", {
        fetch: (_input, init) => {
          calls += 1;
          signal = init?.signal ?? undefined;
          Effect.runSync(Deferred.succeed(ready, undefined));
          return new Promise<Response>(() => undefined);
        },
      }).pipe(Effect.forkChild);
      yield* Deferred.await(ready);
      yield* Fiber.interrupt(fiber);
      expect(signal?.aborted).toBe(true);
      expect(calls).toBe(1);
    })
  );
});

test("a response arriving after fetch interruption is disposed without decoding", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const started = yield* Deferred.make<void>();
      const disposed = yield* Deferred.make<void>();
      let complete: ((response: Response) => void) | undefined;
      let signal: AbortSignal | undefined;
      const fiber = yield* exchangeVercelCodeEffect(config, "code", {
        fetch: (_input, init) => {
          signal = init?.signal ?? undefined;
          const pending = new Promise<Response>((resolve) => {
            complete = resolve;
          });
          Effect.runSync(Deferred.succeed(started, undefined));
          return pending;
        },
      }).pipe(Effect.forkChild);
      yield* Deferred.await(started);
      yield* Fiber.interrupt(fiber);
      expect(signal?.aborted).toBe(true);
      let reads = 0;
      const response = new Response(
        new ReadableStream(
          {
            pull() {
              reads += 1;
            },
            cancel() {
              Effect.runSync(Deferred.succeed(disposed, undefined));
            },
          },
          { highWaterMark: 0 }
        )
      );
      complete?.(response);
      yield* Deferred.await(disposed);
      expect(reads).toBe(0);
      expect(response.body?.locked).toBe(false);
    })
  );
});

test("the request deadline aborts a stalled transport with a sanitized typed error", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const ready = yield* Deferred.make<void>();
      let signal: AbortSignal | undefined;
      let calls = 0;
      const fiber = yield* exchangeVercelCodeEffect(config, "code", {
        fetch: (_input, init) => {
          calls += 1;
          signal = init?.signal ?? undefined;
          Effect.runSync(Deferred.succeed(ready, undefined));
          return new Promise<Response>(() => undefined);
        },
      }).pipe(Effect.result, Effect.forkChild);
      yield* Deferred.await(ready);
      yield* TestClock.adjust(8000);
      const result = yield* Fiber.join(fiber);
      expect(result).toMatchObject({
        _tag: "Failure",
        failure: { provider: "vercel", operation: "exchange", status: null },
      });
      expect(signal?.aborted).toBe(true);
      expect(calls).toBe(1);
    }).pipe(Effect.provide(TestClock.layer()))
  );
});

test("OAuth body deadline releases a stalled reader even if cancel never settles", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const reading = yield* Deferred.make<void>();
      let cancelled = false;
      let signal: AbortSignal | undefined;
      const response = new Response(
        new ReadableStream(
          {
            pull() {
              Effect.runSync(Deferred.succeed(reading, undefined));
            },
            cancel() {
              cancelled = true;
              return new Promise<void>(() => undefined);
            },
          },
          { highWaterMark: 0 }
        )
      );
      const fiber = yield* exchangeVercelCodeEffect(config, "code", {
        fetch: async (_input, init) => {
          signal = init?.signal ?? undefined;
          return response;
        },
      }).pipe(Effect.result, Effect.forkChild);
      yield* Deferred.await(reading);
      yield* TestClock.adjust(8000);
      const result = yield* Fiber.join(fiber);
      expect(result).toMatchObject({
        _tag: "Failure",
        failure: { operation: "exchange", status: 200 },
      });
      expect(cancelled).toBe(true);
      expect(response.body?.locked).toBe(false);
      expect(signal?.aborted).toBe(true);
    }).pipe(Effect.provide(TestClock.layer()))
  );
});

test("Effect interruption owns OAuth body cancellation and releases its reader", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const reading = yield* Deferred.make<void>();
      let cancelled = false;
      let signal: AbortSignal | undefined;
      const response = new Response(
        new ReadableStream(
          {
            pull() {
              Effect.runSync(Deferred.succeed(reading, undefined));
            },
            cancel() {
              cancelled = true;
            },
          },
          { highWaterMark: 0 }
        )
      );
      const fiber = yield* exchangeVercelCodeEffect(config, "code", {
        fetch: async (_input, init) => {
          signal = init?.signal ?? undefined;
          return response;
        },
      }).pipe(Effect.forkChild);
      yield* Deferred.await(reading);
      yield* Fiber.interrupt(fiber);
      expect(cancelled).toBe(true);
      expect(response.body?.locked).toBe(false);
      expect(signal?.aborted).toBe(true);
    })
  );
});

test("mutation cleanup has a bounded deadline when cancel never settles", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const cancelling = yield* Deferred.make<void>();
      const response = new Response(
        new ReadableStream({
          cancel() {
            Effect.runSync(Deferred.succeed(cancelling, undefined));
            return new Promise<void>(() => undefined);
          },
        })
      );
      const fiber = yield* applyVercelDnsRecordsEffect({
        grant,
        zone: "example.com",
        records: [
          {
            type: "A",
            name: "example.com",
            value: "192.0.2.1",
            purpose: "routing",
          },
        ],
        deps: { fetch: async () => response },
      }).pipe(Effect.result, Effect.forkChild);
      yield* Deferred.await(cancelling);
      yield* TestClock.adjust(8000);
      const result = yield* Fiber.join(fiber);
      expect(result).toMatchObject({
        _tag: "Failure",
        failure: { operation: "apply", status: 200 },
      });
      expect(response.body?.locked).toBe(false);
    }).pipe(Effect.provide(TestClock.layer()))
  );
});
