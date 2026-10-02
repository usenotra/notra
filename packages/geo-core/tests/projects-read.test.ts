import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";

import "./utils/infrastructure";

import { projects } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  database,
  initializeDatabase,
  resetDatabase,
  seedProject,
  testDb,
} from "./utils/database";

const { getGeoProject, listGeoProjects } = await import("../src/geo/projects");

beforeAll(initializeDatabase, 30_000);
beforeEach(resetDatabase);
afterAll(() => database.postgres.close());

test("single project reads enforce organization ownership and keep the list response shape", async () => {
  await seedProject("project-a", { organizationId: "org-a" });
  await seedProject("project-b", { organizationId: "org-b" });
  const result = await Effect.runPromise(getGeoProject("org-a", "project-a"));
  if (!result) {
    throw new Error("Expected own project");
  }
  expect(result).toEqual({
    id: "project-a",
    name: "project-a",
    brandSettingsId: "brand-project-a",
    createdAt: expect.any(String),
  });
  expect(
    await Effect.runPromise(getGeoProject("org-a", "project-b"))
  ).toBeNull();
  expect(await Effect.runPromise(getGeoProject("org-a", "missing"))).toBeNull();
  expect(await Effect.runPromise(listGeoProjects("org-a"))).toEqual({
    projects: [result],
  });
});

test("project lists retain oldest-first ordering with stable ID ties", async () => {
  await seedProject("b");
  await seedProject("a");
  await seedProject("c");
  await testDb.update(projects).set({ createdAt: new Date("2026-01-01") });
  await testDb
    .update(projects)
    .set({ createdAt: new Date("2026-01-02") })
    .where(eq(projects.id, "c"));
  const result = await Effect.runPromise(listGeoProjects("org-test"));
  expect(result.projects.map((project) => project.id)).toEqual(["a", "b", "c"]);
});
