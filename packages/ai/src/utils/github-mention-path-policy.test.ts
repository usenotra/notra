import { describe, expect, test } from "bun:test";

import {
  getGitHubMentionPathBlockReason,
  partitionGitHubMentionPaths,
} from "./github-mention-path-policy";

describe("getGitHubMentionPathBlockReason", () => {
  test("allows content and the data files next to it", () => {
    for (const path of [
      "CHANGELOG.md",
      "content/blog/release-2-4.mdx",
      "docs/with space/intro.MD",
      "docs/docs.json",
      "content/authors.yaml",
      "data/releases.csv",
    ]) {
      expect(getGitHubMentionPathBlockReason(path)).toBeNull();
    }
  });

  test("blocks code, scripts, and files without an extension", () => {
    for (const path of [
      "src/index.ts",
      "scripts/deploy.sh",
      "app/page.tsx",
      "Dockerfile",
      "Makefile",
      "public/logo.svg",
      "docs/page.html",
      "docs/page.rst",
      "docs/page.adoc",
    ]) {
      expect(getGitHubMentionPathBlockReason(path)).toContain("content files");
    }
  });

  test("blocks dot files and dot directories", () => {
    for (const path of [
      ".github/workflows/ci.yml",
      ".github/actions/setup/action.yml",
      ".circleci/config.yml",
      ".gitlab-ci.yml",
      "apps/web/.env.json",
      ".husky/pre-commit.md",
    ]) {
      expect(getGitHubMentionPathBlockReason(path)).toContain("dot files");
    }
  });

  test("blocks build and tool configuration in any directory", () => {
    for (const path of [
      "package.json",
      "apps/web/package.json",
      "tsconfig.json",
      "tsconfig.build.json",
      "apps/web/vercel.json",
      "turbo.json",
      "pnpm-workspace.yaml",
      "docker-compose.yml",
      "docker-compose.prod.yaml",
      "netlify.toml",
      "wrangler.json",
      "actions/setup/action.yml",
      "pyproject.toml",
      "npm-shrinkwrap.json",
      "docs/mkdocs.yml",
    ]) {
      expect(getGitHubMentionPathBlockReason(path)).toContain("configuration");
    }
  });

  test("blocks paths that leave the repository", () => {
    for (const path of [
      "",
      "/etc/notes.md",
      "../notes.md",
      "docs//a.md",
      "docs\\a.md",
    ]) {
      expect(getGitHubMentionPathBlockReason(path)).toContain(
        "repository-relative"
      );
    }
  });
});

describe("partitionGitHubMentionPaths", () => {});
