import { expect, mock, test } from "bun:test";

import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const findFirst = mock<() => Promise<{ onboardingDismissed: boolean }>>();
const findProject =
  mock<(query: { where: SQL }) => Promise<{ id: string } | undefined>>();
mock.module("@notra/db/drizzle", () => ({
  db: {
    query: {
      organizations: { findFirst },
      projects: { findFirst: findProject },
    },
  },
}));
mock.module("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

const { redirectIfOnboardingDismissed } = await import("./dismissal");

test("dismissal redirects direct step URLs while preserving the project", async () => {
  findFirst.mockResolvedValue({ onboardingDismissed: true });
  findProject.mockResolvedValue({ id: "project-1" });
  await expect(
    redirectIfOnboardingDismissed("org-1", "acme", "project-1")
  ).rejects.toThrow("REDIRECT:/acme?project=project-1");
  const where = findProject.mock.calls.at(-1)?.[0].where;
  if (!where) {
    throw new Error("Expected an organization-scoped project lookup");
  }
  expect(new PgDialect().sqlToQuery(where).params).toEqual([
    "project-1",
    "org-1",
  ]);
});

test("dismissal drops a foreign or stale project", async () => {
  findFirst.mockResolvedValue({ onboardingDismissed: true });
  findProject.mockResolvedValue(undefined);
  await expect(
    redirectIfOnboardingDismissed("org-1", "acme", "foreign-project")
  ).rejects.toThrow("REDIRECT:/acme");
});

test("development replay bypasses dismissal", async () => {
  findFirst.mockClear();
  await redirectIfOnboardingDismissed("org-1", "acme", "project-1", true);
  expect(findFirst).not.toHaveBeenCalled();
});

test("active onboarding remains available", async () => {
  findFirst.mockResolvedValue({ onboardingDismissed: false });
  await redirectIfOnboardingDismissed("org-1", "acme");
  expect(findFirst).toHaveBeenCalled();
});
