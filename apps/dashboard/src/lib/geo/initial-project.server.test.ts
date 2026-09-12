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
mock.module("next/headers", () => ({ cookies: async () => ({}) }));
mock.module("@/utils/cookies", () => ({
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

test("invalid requested projects fall back to the validated cookie then oldest project", async () => {
  findFirst.mockReset();
  findFirst
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce({ id: "cookie-project" });
  expect(
    await resolveInitialGeoProjectId("org-1", "org", "foreign-project")
  ).toBe("cookie-project");
  findFirst.mockReset();
  findFirst
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce({ id: "oldest-project" });
  expect(
    await resolveInitialGeoProjectId("org-1", "org", "deleted-project")
  ).toBe("oldest-project");
  const oldestQuery = findFirst.mock.calls[2]?.[0];
  const dialect = new PgDialect();
  expect(
    oldestQuery?.orderBy?.map((clause) => dialect.sqlToQuery(clause).sql)
  ).toEqual(['"projects"."created_at" asc', '"projects"."id" asc']);
});
