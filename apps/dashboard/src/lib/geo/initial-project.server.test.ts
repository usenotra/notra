import { expect, mock, test } from "bun:test";

import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const findFirst =
  mock<
    (query: {
      where: SQL;
      orderBy?: readonly SQL[];
    }) => Promise<{ id: string } | undefined>
  >();
mock.module("@notra/db/drizzle", () => ({
  db: { query: { projects: { findFirst } } },
}));
mock.module("@/utils/server-cookies", () => ({
  readServerCookies: () => ({}),
}));
// bun shares module mocks across test files; keep the rest of the module real.
const cookies = await import("@/utils/cookies");
mock.module("@/utils/cookies", () => ({
  ...cookies,
  getLastVisitedProject: () => "cookie-project",
}));
const { resolveInitialGeoProjectId } = await import("./initial-project.server");

test("validates a requested project in the organization before accepting it", async () => {
  findFirst.mockReset();
  findFirst.mockResolvedValueOnce({ id: "requested-project" });
  expect(
    await resolveInitialGeoProjectId("org-1", "org", "requested-project")
  ).toBe("requested-project");
  const where = findFirst.mock.calls[0]?.[0].where;
  if (!where) {
    throw new Error("Expected an organization-scoped project lookup");
  }
  expect(new PgDialect().sqlToQuery(where).params).toEqual([
    "requested-project",
    "org-1",
  ]);
});
