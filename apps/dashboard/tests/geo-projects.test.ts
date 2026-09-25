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
import { geoProjectQueryParser } from "@/lib/hooks/use-geo-project-query";
import { geoProjectRepairPath } from "@/utils/geo-hydration";
import {
  projectWebsiteHost,
  projectWebsiteUrl,
  resolveProjectBrandSelection,
  sortGeoProjectsOldestFirst,
} from "@/utils/geo-projects";

describe("project website selection", () => {
  const identities = [
    { id: "social", name: "Social", websiteUrl: "https://social.example.com" },
    { id: "email", name: "Email", websiteUrl: "https://email.example.com" },
  ];

  test("selects by website instead of a previous or organization selection", () => {
    expect(
      resolveProjectBrandSelection("email.example.com", identities, "social")
        .selectedIdentity?.id
    ).toBe("email");
    expect(
      resolveProjectBrandSelection("other.example.com", identities, "social")
        .selectedIdentity
    ).toBeUndefined();
  });

  test("requires an explicit choice when several identities match", () => {
    const sameWebsite = [
      ...identities,
      {
        id: "technical",
        name: "Technical",
        websiteUrl: "https://email.example.com/docs",
      },
    ];
    expect(
      resolveProjectBrandSelection("email.example.com", sameWebsite, null)
        .selectedIdentity
    ).toBeUndefined();
    expect(
      resolveProjectBrandSelection(
        "email.example.com",
        sameWebsite,
        "technical"
      ).selectedIdentity?.id
    ).toBe("technical");
  });

  test("reuses a newly created identity before the list has refetched", () => {
    const created = {
      id: "new",
      name: "New",
      websiteUrl: "https://new.example.com",
    };
    expect(
      resolveProjectBrandSelection(
        "new.example.com",
        identities,
        "new",
        created
      ).selectedIdentity
    ).toEqual(created);
    expect(
      resolveProjectBrandSelection(
        "new.example.com",
        [...identities, created],
        "new",
        created
      ).matches
    ).toHaveLength(1);
  });

  test("accepts a bare domain and preserves a website path", () => {
    expect(projectWebsiteUrl(" email.example.com/docs ")).toBe(
      "https://email.example.com/docs"
    );
  });

  test("matches www and case variations without mixing product subdomains", () => {
    expect(projectWebsiteHost("https://WWW.Example.com/about")).toBe(
      projectWebsiteHost("example.com")
    );
    expect(projectWebsiteHost("email.example.com")).not.toBe(
      projectWebsiteHost("social.example.com")
    );
  });

  test("rejects missing hosts, credentials and non-web protocols", () => {
    for (const value of [
      "",
      "not a url",
      "https://",
      "localhost",
      "ftp://example.com",
      "https://user:pass@example.com",
    ]) {
      expect(projectWebsiteUrl(value)).toBeNull();
    }
  });
});

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

describe("geoProjectQueryParser", () => {
  test("normalizes whitespace before project selection", () => {
    expect(geoProjectQueryParser.parse("  project-1  ")).toBe("project-1");
    expect(geoProjectQueryParser.parse("   ")).toBeNull();
  });
});

test("repairs a foreign integration project without losing the callback query", () => {
  expect(
    geoProjectRepairPath(
      "org",
      { project: "foreign", connected: "true" },
      "project-b",
      "/integrations/google-search-console"
    )
  ).toBe(
    "/org/integrations/google-search-console?connected=true&project=project-b"
  );
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
