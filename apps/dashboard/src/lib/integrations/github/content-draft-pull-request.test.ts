import { expect, test } from "bun:test";

import { createContentBranchName } from "./publish-content-to-github";
import {
  buildContentPullRequestBody,
  mergeContentPullRequestBody,
} from "./pull-request-body";

const PARAMS = {
  badgeUrls: {
    dark: "https://app.notra.test/badges/open-in-notra-dark.svg",
    light: "https://app.notra.test/badges/open-in-notra-light.svg",
  },
  contentType: "changelog" as const,
  contentUrl: "https://app.notra.test/acme/content/post_123",
  markdown: "Brand views are simpler.",
  title: "Dashboard Clarity and Content Tooling Updates",
};

test("draft pull request body leads with the changelog", () => {
  const body = buildContentPullRequestBody(PARAMS);
  const contentAt = body.indexOf(
    "# Dashboard Clarity and Content Tooling Updates"
  );
  const linkAt = body.indexOf("Open in Notra");
  const sectionEnd = body.indexOf("<!-- notra:content:end -->");

  expect(contentAt).toBeGreaterThan(-1);
  expect(sectionEnd).toBeGreaterThan(contentAt);
  expect(linkAt).toBeGreaterThan(sectionEnd);
  expect(body.trimEnd().endsWith("</a>")).toBe(true);
});

test("republish keeps Open in Notra under the draft and later notes", () => {
  const fresh = buildContentPullRequestBody(PARAMS);
  const link = fresh.slice(fresh.indexOf("<a href=")).trim();
  const previous = [
    "<!-- notra:content:start -->",
    link,
    "",
    "# Dashboard Clarity and Content Tooling Updates",
    "",
    "Brand views are simpler.",
    "<!-- notra:content:end -->",
    "",
    "## Summary by cubic",
    "",
    "Adds a changelog entry.",
  ].join("\n");

  const merged = mergeContentPullRequestBody(previous, {
    ...PARAMS,
    markdown: "Brand views now explain integration setup.",
  });

  expect(
    merged.indexOf("Brand views now explain integration setup.")
  ).toBeLessThan(merged.indexOf("Summary by cubic"));
  expect(merged.indexOf("Summary by cubic")).toBeLessThan(
    merged.indexOf("Open in Notra")
  );
  expect(merged.match(/Open in Notra/g)?.length).toBe(1);
  expect(merged.trimEnd().endsWith("</a>")).toBe(true);
});

test("content branch names use the title and a stable suffix", () => {
  const contentId = "post_123";
  const branch = createContentBranchName(
    "changelog",
    "Dashboard Clarity and Content Tooling Updates",
    contentId
  );
  const renamed = createContentBranchName(
    "changelog",
    "Renamed Dashboard Clarity",
    contentId
  );

  expect(
    branch.startsWith(
      "notra/changelog-dashboard-clarity-and-content-tooling-updates-"
    )
  ).toBe(true);
  expect(branch.slice(-6)).toMatch(/^[0-9a-f]{6}$/);
  expect(branch.endsWith(renamed.slice(-6))).toBe(true);
  expect(
    createContentBranchName(
      "changelog",
      "one two three four five six seven",
      contentId
    )
  ).toMatch(/^notra\/changelog-one-two-three-four-five-six-[0-9a-f]{6}$/);
  expect(createContentBranchName("blog_post", "Ship notes", contentId)).toMatch(
    /^notra\/blog-post-ship-notes-[0-9a-f]{6}$/
  );
  expect(createContentBranchName("changelog", "!!!", contentId)).toMatch(
    /^notra\/changelog-update-[0-9a-f]{6}$/
  );
});
