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
    // A rollback re-activates an old deployment under a new generation.
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
    // A build queued before the PR closed must not bring the preview back; a reopened PR (newer) may.
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
    expect(branchPreviewKey("docs", "acme")).toBe("br-docs");
  });
});
