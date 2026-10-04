import { beforeEach, expect, mock, test } from "bun:test";

import { call } from "@orpc/server";

import { COMPANY_LOGO_RATE_LIMIT_PER_USER_PER_MINUTE } from "../../src/constants/company-logo";
import { createORPCContext } from "../../src/lib/orpc/context";
import type { CompanyLogoResult } from "../../src/types/onboarding";

const usage = new Map<string, number>();
const cached = new Map<string, CompanyLogoResult>();
const limit = mock(async (userId: string) => {
  const count = (usage.get(userId) ?? 0) + 1;
  usage.set(userId, count);
  return {
    success: count <= COMPANY_LOGO_RATE_LIMIT_PER_USER_PER_MINUTE,
    reason: undefined as "timeout" | undefined,
  };
});
const search = mock(async () => ({ results: [] }));
const retrieve = mock(async () => ({ brand: { logos: [] } }));
const writeCache = mock(async () => undefined);

mock.module("@notra/ai/utils/context-dev", () => ({
  searchBrands: search,
  retrieveBrand: retrieve,
}));
mock.module("@notra/db/drizzle", () => ({ db: {} }));
mock.module("@notra/geo-core/geo/projects", () => ({
  createGeoProject: mock(),
}));
mock.module("@/lib/auth/organization", () => ({
  assertOrganizationAccess: mock(),
  assertAuthenticated: async ({ headers }: { headers: Headers }) => {
    const id = headers.get("x-test-user-id");
    if (!id) {
      throw new Error("Unauthenticated");
    }
    return { user: { id }, session: {} };
  },
}));
mock.module("@/lib/onboarding-agent", () => ({
  getOnboardingAgentState: mock(),
  startSelfServeOnboardingAgent: mock(),
}));
mock.module("@/lib/onboarding/company-logo-cache", () => ({
  readCachedCompanyLogo: async ({ query }: { query: string }) =>
    cached.get(query) ?? null,
  writeCachedCompanyLogo: writeCache,
}));
mock.module("@/lib/orpc/effect", () => ({ runOrpcEffect: mock() }));
mock.module("@/lib/orpc/utils/geo-errors", () => ({ toGeoOrpcError: mock() }));
mock.module("@/utils/ratelimit", () => ({
  ratelimit: { companyLogo: { limit } },
}));

const { onboardingRouter } =
  await import("../../src/lib/orpc/routers/onboarding");

async function lookup(query: string, searchByName = true, userId = "user-1") {
  const context = await createORPCContext({
    headers: new Headers({ "x-test-user-id": userId }),
  });
  return call(
    onboardingRouter.companyLogo,
    { query, searchByName },
    { context }
  );
}

beforeEach(() => {
  usage.clear();
  cached.clear();
  limit.mockClear();
  search.mockClear();
  retrieve.mockClear();
  writeCache.mockClear();
});

test("varying queries and modes cannot bypass one user's limit, including concurrent calls", async () => {
  const results = await Promise.allSettled(
    Array.from(
      { length: COMPANY_LOGO_RATE_LIMIT_PER_USER_PER_MINUTE + 2 },
      (_, i) => lookup(`brand-${i}.com`, i % 2 === 0)
    )
  );
  expect(
    results.filter((result) => result.status === "fulfilled")
  ).toHaveLength(COMPANY_LOGO_RATE_LIMIT_PER_USER_PER_MINUTE);
  const rejected = results.filter((result) => result.status === "rejected");
  expect(rejected).toHaveLength(2);
  for (const result of rejected) {
    expect(result.reason.code).toBe("TOO_MANY_REQUESTS");
  }
  expect(search.mock.calls.length + retrieve.mock.calls.length).toBe(
    COMPANY_LOGO_RATE_LIMIT_PER_USER_PER_MINUTE
  );
  expect(limit.mock.calls.every(([key]) => key === "user-1")).toBe(true);
  await expect(
    lookup("other-brand.com", false, "user-2")
  ).resolves.toBeDefined();
});

test("cached resolved and unresolved results remain available after the budget is exhausted", async () => {
  usage.set("user-1", COMPANY_LOGO_RATE_LIMIT_PER_USER_PER_MINUTE);
  for (const result of [
    { domain: "cached.com", url: "https://media.brand.dev/logo.png" },
    { domain: null, url: null },
  ]) {
    cached.set("Cached", result);
    await expect(lookup("Cached")).resolves.toEqual(result);
  }
  expect(limit).not.toHaveBeenCalled();
  expect(search).not.toHaveBeenCalled();
  expect(retrieve).not.toHaveBeenCalled();
});

test("a fail-open limiter timeout never reaches either paid lookup", async () => {
  for (const searchByName of [true, false]) {
    limit.mockResolvedValueOnce({ success: true, reason: "timeout" });
    await expect(lookup("brand.com", searchByName)).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  }
  expect(search).not.toHaveBeenCalled();
  expect(retrieve).not.toHaveBeenCalled();
  expect(writeCache).not.toHaveBeenCalled();
});

test("a limiter error does not reach brand lookup or poison the cache", async () => {
  limit.mockRejectedValueOnce(new Error("Redis unavailable"));
  await expect(lookup("brand.com")).rejects.toThrow("Redis unavailable");
  expect(search).not.toHaveBeenCalled();
  expect(retrieve).not.toHaveBeenCalled();
  expect(writeCache).not.toHaveBeenCalled();
});

test("unauthenticated requests cannot use the cache or paid lookup budget", async () => {
  cached.set("Cached", { domain: "cached.com", url: null });
  const context = await createORPCContext({ headers: new Headers() });
  await expect(
    call(onboardingRouter.companyLogo, { query: "Cached" }, { context })
  ).rejects.toThrow("Unauthenticated");
  expect(limit).not.toHaveBeenCalled();
  expect(search).not.toHaveBeenCalled();
  expect(retrieve).not.toHaveBeenCalled();
});
