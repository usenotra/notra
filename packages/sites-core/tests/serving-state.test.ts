import { describe, expect, test } from "bun:test";

import {
  branchPreviewKey,
  parseSiteHost,
  sitePreviewHost,
} from "../src/utils/hosts";
import { normalizeSiteMounts, resolveAreaForPath } from "../src/utils/mounts";
import {
  activatePreviewInState,
  activateProductionInState,
  createInitialServingState,
  referencedDeploymentIds,
  removePreviewFromState,
} from "../src/utils/serving-state";

const now = new Date("2026-10-03T00:00:00Z");
const initial = createInitialServingState({ siteId: "s", slug: "acme", now });

describe("generation ordering", () => {
  test("stale removals preserve newer pointers and tombstones", () => {
    const active = activatePreviewInState(
      initial,
      "pr-7",
      {
        deploymentId: "reopened-11",
        sequence: 11,
        visibility: "protected",
        expiresAt: null,
      },
      now
    );
    expect(active.outcome).toBe("activated");
    if (active.outcome !== "activated") {
      throw new Error("Preview did not activate");
    }
    const removed = removePreviewFromState(
      { ...active.state, removedPreviews: { "pr-7": 10 } },
      "pr-7",
      9,
      now
    );
    expect(removed.previews["pr-7"]).toEqual(active.state.previews["pr-7"]);
    expect(removed.removedPreviews["pr-7"]).toBe(10);
    const current = removePreviewFromState(removed, "pr-7", 11, now);
    expect(current.previews).toEqual({});
    expect(current.removedPreviews["pr-7"]).toBe(11);
    expect(removePreviewFromState(current, "pr-7", 9, now)).toBe(current);
  });
  test("production only moves forward; retries are idempotent", () => {
    const first = activateProductionInState(
      initial,
      { deploymentId: "d2", generation: 2 },
      now
    );
    expect(first.outcome).toBe("activated");
    const state = first.outcome === "activated" ? first.state : initial;
    expect(
      activateProductionInState(
        state,
        { deploymentId: "d1", generation: 1 },
        now
      ).outcome
    ).toBe("superseded");
    expect(
      activateProductionInState(
        state,
        { deploymentId: "d2", generation: 2 },
        now
      ).outcome
    ).toBe("already_active");
    expect(
      activateProductionInState(
        state,
        { deploymentId: "d1", generation: 5 },
        now
      ).outcome
    ).toBe("activated");
  });

  test("previews are ordered per key and protected from cleanup", () => {
    const pointer = { visibility: "protected" as const, expiresAt: null };
    const a = activatePreviewInState(
      initial,
      "pr-1",
      { deploymentId: "p4", sequence: 4, ...pointer },
      now
    );
    const state = a.outcome === "activated" ? a.state : initial;
    expect(
      activatePreviewInState(
        state,
        "pr-1",
        { deploymentId: "p3", sequence: 3, ...pointer },
        now
      ).outcome
    ).toBe("superseded");
    expect(
      activatePreviewInState(
        state,
        "pr-2",
        { deploymentId: "p3", sequence: 3, ...pointer },
        now
      ).outcome
    ).toBe("activated");
    expect([...referencedDeploymentIds(state)]).toEqual(["p4"]);
    const removed = removePreviewFromState(state, "pr-1", 9, now);
    expect(removed.previews).toEqual({});
    expect(
      activatePreviewInState(
        removed,
        "pr-1",
        { deploymentId: "p8", sequence: 8, ...pointer },
        now
      ).outcome
    ).toBe("superseded");
    expect(
      activatePreviewInState(
        removed,
        "pr-1",
        { deploymentId: "p10", sequence: 10, ...pointer },
        now
      ).outcome
    ).toBe("activated");
  });
});

describe("mounts", () => {
  test("blog and changelog may share a site but not overlap", () => {
    expect(
      normalizeSiteMounts({ blog: "Blog/", changelog: "/changelog" })
    ).toEqual({ blog: "/blog", changelog: "/changelog" });
    expect(() =>
      normalizeSiteMounts({ blog: "/news", changelog: "/news/changes" })
    ).toThrow();
    expect(() =>
      normalizeSiteMounts({ blog: "/x", changelog: "/x" })
    ).toThrow();
    expect(() => normalizeSiteMounts({ blog: "/_notra" })).toThrow();
    const rootAndNested = normalizeSiteMounts({
      blog: "/",
      changelog: "/changelog",
    });
    expect(resolveAreaForPath(rootAndNested, "/changelog/v2")?.area).toBe(
      "changelog"
    );
    expect(resolveAreaForPath(rootAndNested, "/post")?.area).toBe("blog");
  });
});

describe("preview hosts", () => {
  test("long branch names still produce a valid, unique DNS label", () => {
    const slug = "acme-product-changelog-site-notes-x";
    const a = branchPreviewKey("feature/rewrite-the-onboarding-guide-v2", slug);
    const b = branchPreviewKey("feature/rewrite-the-onboarding-guide-v3", slug);
    expect(a).not.toBe(b);
    for (const key of [a, b]) {
      const host = sitePreviewHost(key, slug, "notra.site");
      expect(host.split(".")[0]?.length ?? 99).toBeLessThanOrEqual(63);
      expect(parseSiteHost(host, "notra.site")).toEqual({
        kind: "preview",
        slug,
        previewKey: key,
      });
    }
    expect(branchPreviewKey("docs", "acme")).toMatch(/^br-docs-[a-z0-9]+$/);
  });

  test("branch identities preserve punctuation and case differences", () => {
    const branches = [
      "feature/foo",
      "feature-foo",
      "Feature/foo",
      "feature.foo",
    ];
    const keys = branches.map((branch) => branchPreviewKey(branch, "acme"));
    expect(new Set(keys).size).toBe(branches.length);
    for (const [index, key] of keys.entries()) {
      expect(branchPreviewKey(branches[index] ?? "", "acme")).toBe(key);
      expect(
        parseSiteHost(sitePreviewHost(key, "acme", "notra.site"), "notra.site")
      ).toEqual({
        kind: "preview",
        slug: "acme",
        previewKey: key,
      });
    }
  });
});
