import { describe, expect, test } from "bun:test";

import {
  rememberCreatedGeoProject,
  takeCreatedGeoProject,
} from "@/lib/db/geo-project-create-cache";
import { sortGeoProjectsOldestFirst } from "@/utils/geo-projects";

describe("sortGeoProjectsOldestFirst", () => {
  test("orders by createdAt then id", () => {
    const projects = sortGeoProjectsOldestFirst([
      {
        id: "b",
        name: "Beta",
        brandSettingsId: "brand-1",
        createdAt: "2026-01-02T00:00:00.000Z",
      },
      {
        id: "a",
        name: "Alpha",
        brandSettingsId: "brand-1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "c",
        name: "Gamma",
        brandSettingsId: "brand-1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    expect(projects.map((project) => project.id)).toEqual(["a", "c", "b"]);
  });
});

describe("geo project create cache", () => {
  test("stores and consumes created projects by temp id", () => {
    const tempId = "temp-1";
    const created = {
      id: "server-1",
      name: "Acme",
      brandSettingsId: "brand-1",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    rememberCreatedGeoProject(tempId, created);
    expect(takeCreatedGeoProject(tempId)).toEqual(created);
    expect(takeCreatedGeoProject(tempId)).toBeUndefined();
  });
});
