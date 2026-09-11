import { expect, test } from "bun:test";

import {
  geoHydrationInputs,
  geoProjectRepairPath,
  geoRequestedProjectId,
  normalizeGeoProjectId,
} from "@/utils/geo-hydration";

test("an empty ?project= reads as no requested project", () => {
  expect(geoRequestedProjectId({ project: "" })).toBeUndefined();
  expect(geoRequestedProjectId({ project: ["", "later"] })).toBeUndefined();
  expect(geoRequestedProjectId({ project: "  " })).toBeUndefined();
  expect(geoRequestedProjectId({})).toBeUndefined();
  expect(geoRequestedProjectId({ project: "project-1" })).toBe("project-1");
});

test("the client scope normalises the same way the server does", () => {
  // `useGeoProjectQueryState` yields "" for `?project=`; the provider must fall
  // back to the server-resolved id instead of scoping queries to "".
  expect(normalizeGeoProjectId("") ?? "server-project").toBe("server-project");
  expect(normalizeGeoProjectId(null) ?? "server-project").toBe(
    "server-project"
  );
  expect(normalizeGeoProjectId("project-1") ?? "server-project").toBe(
    "project-1"
  );
});

test("hydration keys use the server-resolved project for an empty param", () => {
  const search = { project: "" };
  const inputs = geoHydrationInputs(
    "org-1",
    geoRequestedProjectId(search) ?? "server-project",
    search
  );
  expect(inputs.settings.projectId).toBe("server-project");
  expect(inputs.overview.projectId).toBe("server-project");
});

test("repair path drops the invalid project, keeps other params and sets the resolved one", () => {
  expect(
    geoProjectRepairPath(
      "acme",
      { project: "bad", tab: "prompts", range: ["7d", "30d"] },
      "good"
    )
  ).toBe("/acme/geo?tab=prompts&range=7d&range=30d&project=good");
  expect(geoProjectRepairPath("acme", { project: "bad" }, undefined)).toBe(
    "/acme/geo"
  );
});
