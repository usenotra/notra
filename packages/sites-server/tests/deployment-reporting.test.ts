import { expect, test } from "bun:test";

import { SMART_DEPLOYMENT_SKIP_REASON } from "../src/constants/smart-deployments";
import type { SiteDeployment } from "../src/types/deployments";
import type { Site } from "../src/types/sites";
import { deploymentCheckReport } from "../src/utils/deployment-check-report";
import { previewCommentBody } from "../src/utils/preview-comment";

const deployment = {
  kind: "preview",
  status: "skipped",
  commitSha: "a".repeat(40),
  fileCount: 3,
  buildDurationMs: 2000,
  target: {
    publicOrigin: "https://pr-42--synthetic.notra.site",
    mounts: { blog: "/blog" },
  },
} as SiteDeployment;
const site = {
  id: "synthetic",
  slug: "synthetic",
  previewVisibility: "protected",
  previewPassword: null,
} as Site;
const outcome = {
  kind: "skipped",
  reason: SMART_DEPLOYMENT_SKIP_REASON,
} as const;
const buildUrl = "https://app.example.test/sites/synthetic/deployments/skipped";
const previewUrl = "https://pr-42--synthetic.notra.site/blog";

test("unchanged previews remain skipped checks with an explicit title and preview link", () => {
  const report = deploymentCheckReport(deployment, outcome);
  expect(report.conclusion).toBe("skipped");
  expect(report.title).toBe("Skipped – no site changes");
  expect(report.summary).toContain(SMART_DEPLOYMENT_SKIP_REASON);
  expect(report.summary).toContain(`Preview: ${previewUrl}`);
  expect(report.summary).toContain(
    "The existing version is still being served."
  );
  expect(report.liveUrl).toBe(previewUrl);
});

test("unchanged production checks link the published site", () => {
  const report = deploymentCheckReport(
    {
      ...deployment,
      kind: "production",
      target: {
        ...deployment.target,
        publicOrigin: "https://synthetic.notra.site",
      },
    },
    outcome
  );
  expect(report.conclusion).toBe("skipped");
  expect(report.summary).toContain(
    "Published: https://synthetic.notra.site/blog"
  );
  expect(report.liveUrl).toBe("https://synthetic.notra.site/blog");
});

test.each(["canceled", "superseded"] as const)(
  "%s builds are not reported as unchanged and do not advertise a preview",
  (status) => {
    const current = { ...deployment, status };
    const skipped = {
      kind: "skipped",
      reason: "A newer commit replaces this build.",
    } as const;
    expect(deploymentCheckReport(current, skipped)).toEqual({
      conclusion: "skipped",
      title: "Skipped",
      summary: skipped.reason,
      liveUrl: null,
    });
    const comment = previewCommentBody(site, current, buildUrl, skipped);
    expect(comment).toContain("⏭️ Build skipped");
    expect(comment).not.toContain("no site changes");
    expect(comment).not.toContain("Open preview");
  }
);

test("unchanged preview comments retain the preview link and access notice", () => {
  const comment = previewCommentBody(site, deployment, buildUrl, outcome);
  expect(comment).toContain("⏭️ Skipped – no site changes");
  expect(comment).toContain(SMART_DEPLOYMENT_SKIP_REASON);
  expect(comment).toContain(`[Open preview](<${previewUrl}>)`);
  expect(comment).toContain(`[View build](<${buildUrl}>)`);
  expect(comment).toContain(
    "This preview is protected. Sign in to Notra to open it."
  );
});

test("successful builds retain their existing status and build metrics", () => {
  const report = deploymentCheckReport(
    { ...deployment, status: "ready" },
    { kind: "live" }
  );
  expect(report.conclusion).toBe("success");
  expect(report.title).toBe("Preview ready");
  expect(report.summary).toContain("3 files, built in 2 s.");
  expect(report.liveUrl).toBe(previewUrl);
});

test("failed builds retain their failure summary and no preview link", () => {
  expect(
    deploymentCheckReport(
      { ...deployment, status: "failed" },
      {
        kind: "failed",
        summary: "Invalid site configuration.",
        diagnostics: [],
      }
    )
  ).toEqual({
    conclusion: "failure",
    title: "Build failed",
    summary: "Invalid site configuration.",
    liveUrl: null,
  });
});

test("unpublished builds retain their neutral check and no preview link", () => {
  const report = deploymentCheckReport(
    { ...deployment, status: "ready" },
    { kind: "not_live" }
  );
  expect(report.conclusion).toBe("neutral");
  expect(report.title).toBe("Superseded by a newer commit");
  expect(report.liveUrl).toBeNull();
});
