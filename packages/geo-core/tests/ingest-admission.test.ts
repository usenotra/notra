import { beforeEach, expect, mock, test } from "bun:test";

import type { GeoTrafficEventRow } from "@notra/analytics/tinybird/datasources";
import type { Ratelimit } from "@upstash/ratelimit";
import { Effect } from "effect";

import { GEO_INGEST_ADMISSION_RATELIMIT_MAX_REQUESTS } from "../src/constants/ingest";
import type { GeoIngestIdentity } from "../src/types/geo";
import { geoIngestAdmissionKey } from "../src/utils/geo-ingest-admission-key";

const identity: GeoIngestIdentity = {
  organizationId: "org-test",
  projectId: "project-test",
  generation: 1,
};
const verify = mock((): GeoIngestIdentity | null => identity);
const active = mock(async () => true);
const hosts = mock(async (): Promise<string[] | null> => ["example.com"]);
const admissionLimit = mock(
  async (
    _key: string
  ): Promise<
    Pick<Awaited<ReturnType<Ratelimit["limit"]>>, "success" | "reason">
  > => ({ success: true })
);
const acceptedLimit = mock(async (_key: string) => ({ success: true }));
const write = mock(async (rows: GeoTrafficEventRow[]) => ({
  successful_rows: rows.length,
  quarantined_rows: 0,
}));

mock.module("@notra/geo-core/geo/ingest", () => ({
  verifyGeoIngestToken: verify,
}));
mock.module("@notra/analytics/tinybird/client", () => ({
  ingestGeoTrafficEvents: write,
}));
mock.module("../src/ingest/identity", () => ({
  isGeoIngestIdentityActive: active,
}));
mock.module("../src/ingest/hosts", () => ({ loadIngestAllowedHosts: hosts }));
mock.module("../src/ingest/ratelimit", () => ({
  geoIngestAdmissionRatelimit: { limit: admissionLimit },
  geoIngestRatelimit: { limit: acceptedLimit },
}));
mock.module("../src/ingest/analytics", () => ({
  trackGeoIngestAnalytics: () => Effect.void,
}));
mock.module("../src/ingest/journey", () => ({
  resolveJourneyId: () => ({ journeyId: "fixture", path: "/" }),
}));

const { runGeoIngest } = await import("../src/ingest/pipeline");
const {
  GeoIngestFailedError,
  GeoIngestInvalidTokenError,
  GeoIngestRateLimitedError,
} = await import("../src/ingest/errors");

function run(
  body: unknown = {
    method: "GET",
    url: "https://example.com/",
    userAgent: "GPTBot",
  }
) {
  const request = new Request("https://ingest.example/api/geo/ingest", {
    method: "POST",
    headers: { authorization: "Bearer fixture" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return Effect.runPromise(Effect.result(runGeoIngest(request, () => {})));
}

beforeEach(() => {
  for (const fn of [
    verify,
    active,
    hosts,
    admissionLimit,
    acceptedLimit,
    write,
  ]) {
    fn.mockClear();
  }
  verify.mockImplementation(() => identity);
  active.mockImplementation(async () => true);
  hosts.mockImplementation(async () => ["example.com"]);
  admissionLimit.mockImplementation(async () => ({ success: true }));
  acceptedLimit.mockImplementation(async () => ({ success: true }));
});

test("admission denials prevent identity and host lookups for unknown domains", async () => {
  admissionLimit.mockImplementation(async () => ({ success: false }));
  const result = await run({
    method: "GET",
    url: "https://unrelated.dev/",
    userAgent: "GPTBot",
  });
  expect(result._tag).toBe("Failure");
  if (result._tag === "Failure") {
    expect(result.failure).toBeInstanceOf(GeoIngestRateLimitedError);
  }
  expect(active).not.toHaveBeenCalled();
  expect(hosts).not.toHaveBeenCalled();
  expect(acceptedLimit).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
});

test("admission denials also prevent auth lookups for malformed payloads and URLs", async () => {
  admissionLimit.mockImplementation(async () => ({ success: false }));
  for (const body of [
    "invalid-json",
    { method: "GET" },
    { method: "GET", url: ":::" },
  ]) {
    const result = await run(body);
    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure).toBeInstanceOf(GeoIngestRateLimitedError);
    }
  }
  expect(active).not.toHaveBeenCalled();
  expect(hosts).not.toHaveBeenCalled();
});

test("admission timeouts and transport errors fail closed before DB work", async () => {
  for (const limit of [
    async () => ({ success: true, reason: "timeout" as const }),
    async () => {
      throw new Error("Redis unavailable");
    },
  ]) {
    admissionLimit.mockImplementation(limit);
    const result = await run();
    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure).toBeInstanceOf(GeoIngestFailedError);
    }
  }
  expect(active).not.toHaveBeenCalled();
  expect(hosts).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
});

test("human traffic keeps its zero-I/O drop path", async () => {
  const result = await run({
    method: "GET",
    url: "https://example.com/",
    userAgent: "Mozilla/5.0",
  });
  expect(result).toMatchObject({
    _tag: "Success",
    success: { outcome: "dropped", reason: "visitor_type" },
  });
  expect(admissionLimit).not.toHaveBeenCalled();
  expect(acceptedLimit).not.toHaveBeenCalled();
  expect(active).not.toHaveBeenCalled();
  expect(hosts).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
});

test("invalid signatures cannot consume either limiter", async () => {
  verify.mockImplementation(() => null);
  const result = await run("invalid-json");
  expect(result._tag).toBe("Failure");
  if (result._tag === "Failure") {
    expect(result.failure).toBeInstanceOf(GeoIngestInvalidTokenError);
  }
  expect(admissionLimit).not.toHaveBeenCalled();
  expect(acceptedLimit).not.toHaveBeenCalled();
  expect(active).not.toHaveBeenCalled();
});

test("revoked tokens cannot consume the accepted-traffic organization quota", async () => {
  active.mockImplementation(async () => false);
  const result = await run();
  expect(result._tag).toBe("Failure");
  if (result._tag === "Failure") {
    expect(result.failure).toBeInstanceOf(GeoIngestInvalidTokenError);
  }
  expect(admissionLimit).toHaveBeenCalledWith(geoIngestAdmissionKey(identity));
  expect(acceptedLimit).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
});

test("admission budgets are separate across token generations and project scopes", () => {
  const keys = [
    identity,
    { ...identity, generation: 2 },
    { ...identity, projectId: null },
    { ...identity, projectId: "other-project" },
    { ...identity, organizationId: "other-org" },
  ].map(geoIngestAdmissionKey);
  expect(new Set(keys).size).toBe(keys.length);
});

test("valid AI events still use the existing organization-wide quota once", async () => {
  const result = await run();
  expect(result._tag).toBe("Success");
  expect(admissionLimit).toHaveBeenCalledTimes(1);
  expect(admissionLimit).toHaveBeenCalledWith(geoIngestAdmissionKey(identity));
  expect(acceptedLimit).toHaveBeenCalledTimes(1);
  expect(acceptedLimit).toHaveBeenCalledWith(identity.organizationId);
  expect(write).toHaveBeenCalledTimes(1);
});

test("a rejected-domain burst cannot exceed its admission budget for expensive checks", async () => {
  let calls = 0;
  admissionLimit.mockImplementation(async () => ({
    success: ++calls <= GEO_INGEST_ADMISSION_RATELIMIT_MAX_REQUESTS,
  }));
  for (let i = 0; i < GEO_INGEST_ADMISSION_RATELIMIT_MAX_REQUESTS + 100; i++) {
    const result = await run({
      method: "GET",
      url: "https://unrelated.dev/",
      userAgent: "GPTBot",
    });
    expect(result._tag).toBe(
      i < GEO_INGEST_ADMISSION_RATELIMIT_MAX_REQUESTS ? "Success" : "Failure"
    );
  }
  expect(active).toHaveBeenCalledTimes(
    GEO_INGEST_ADMISSION_RATELIMIT_MAX_REQUESTS
  );
  expect(hosts).toHaveBeenCalledTimes(
    GEO_INGEST_ADMISSION_RATELIMIT_MAX_REQUESTS
  );
  expect(acceptedLimit).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
});
