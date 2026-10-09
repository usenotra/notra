import { expect, test } from "bun:test";

import { Deferred, Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";

import { DOMAIN_CONNECT_HTTP_TIMEOUT_MS } from "../src/constants/domain-connect";
import { DNS_RESOLVER_TIMEOUT_MS } from "../src/constants/domains";
import {
  discoverDomainConnect,
  discoverDomainConnectEffect,
} from "../src/domain-connect";
import { domainConnectSettings } from "./constants/provider-effect";

test("Domain Connect composes discovery with its injected public-network transport", async () => {
  const settings = await discoverDomainConnect("blog.example.com", {
    resolveTxt: async (name) => {
      expect(name).toBe("_domainconnect.example.com");
      return [["provider.example"]];
    },
    fetch: async (input, init) => {
      expect(String(input)).toBe(
        "https://provider.example/v2/example.com/settings"
      );
      expect(new Headers(init?.headers).get("accept")).toBe("application/json");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return Response.json(domainConnectSettings);
    },
  });
  expect(settings).toEqual({
    ...domainConnectSettings,
    domain: "example.com",
    host: "blog",
  });
});

test("Domain Connect DNS timeout cancels discovery and returns an honest unsupported result", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const started = yield* Deferred.make<void>();
      let signal: AbortSignal | undefined;
      let fetches = 0;
      const fiber = yield* discoverDomainConnectEffect("blog.example.com", {
        resolveTxt: async (_name, ownedSignal) => {
          signal = ownedSignal;
          Effect.runSync(Deferred.succeed(started, undefined));
          return await new Promise<string[][]>(() => {});
        },
        fetch: async () => {
          fetches++;
          throw new Error("Unexpected HTTP request");
        },
      }).pipe(Effect.forkChild);
      yield* Deferred.await(started);
      yield* TestClock.adjust(DNS_RESOLVER_TIMEOUT_MS * 2);
      expect(yield* Fiber.join(fiber)).toBeNull();
      expect(signal?.aborted).toBe(true);
      expect(fetches).toBe(0);
    }).pipe(Effect.provide(TestClock.layer()))
  );
});

test("Domain Connect body timeout releases public-fetch streams and aborts the transport", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const reading = yield* Deferred.make<void>();
      let signal: AbortSignal | null | undefined;
      let cancelled = false;
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
      const fiber = yield* discoverDomainConnectEffect("blog.example.com", {
        resolveTxt: async () => [["provider.example"]],
        fetch: async (_input, init) => {
          signal = init?.signal;
          return new Response(stream);
        },
      }).pipe(Effect.forkChild);
      yield* Deferred.await(reading);
      yield* TestClock.adjust(DOMAIN_CONNECT_HTTP_TIMEOUT_MS);
      expect(yield* Fiber.join(fiber)).toBeNull();
      expect(signal?.aborted).toBe(true);
      expect(cancelled).toBe(true);
      expect(stream.locked).toBe(false);
    }).pipe(Effect.provide(TestClock.layer()))
  );
});
