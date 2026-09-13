import { describe, expect, test } from "bun:test";

import {
  rejectProjectCreateHandoff,
  resolveProjectCreateHandoff,
  waitForProjectCreateHandoff,
} from "@/lib/db/geo-project-create-handoff";
import {
  clearPendingDeleteSnapshot,
  getPendingDeleteSnapshots,
  rememberPendingDeleteSnapshot,
} from "@/lib/db/geo-project-pending-deletes";
import { sortGeoProjectsOldestFirst } from "@/utils/geo-projects";

const sampleProject = {
  id: "server-1",
  name: "Acme",
  brandSettingsId: "brand-1",
  createdAt: "2026-01-01T00:00:00.000Z",
};

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

describe("geo project create handoff", () => {
  test("resolves created projects by transaction id", async () => {
    const transactionId = "tx-1";
    const createdPromise = waitForProjectCreateHandoff(transactionId);
    resolveProjectCreateHandoff(transactionId, sampleProject);
    await expect(createdPromise).resolves.toEqual(sampleProject);
  });

  test("rejects failed creates by transaction id", async () => {
    const transactionId = "tx-2";
    const createdPromise = waitForProjectCreateHandoff(transactionId);
    rejectProjectCreateHandoff(transactionId, new Error("create failed"));
    await expect(createdPromise).rejects.toThrow("create failed");
  });
});

describe("geo project pending deletes", () => {
  test("shares delete snapshots across collection consumers", () => {
    const collectionId = "geo-projects:org-1:all";
    rememberPendingDeleteSnapshot(collectionId, sampleProject);
    expect(getPendingDeleteSnapshots(collectionId).get("server-1")).toEqual(
      sampleProject
    );
    clearPendingDeleteSnapshot(collectionId, "server-1");
    expect(getPendingDeleteSnapshots(collectionId).size).toBe(0);
  });
});
