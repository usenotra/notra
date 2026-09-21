import { describe, expect, test } from "bun:test";

import { getGitHubMentionPathBlockReason } from "./github-mention-path-policy";

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

  test("blocks executable and dependency files disguised as text", () => {
    for (const path of [
      "CMakeLists.txt",
      "native/CMakeLists.txt",
      "requirements.txt",
      "requirements-dev.txt",
      "constraints.txt",
    ]) {
      expect(getGitHubMentionPathBlockReason(path)).toContain("text files");
    }
  });

  test("allows structured content data only in explicit content directories", () => {
    for (const path of ["src/routes.yaml", "infra/production.toml"]) {
      expect(getGitHubMentionPathBlockReason(path)).toContain(
        "content data directory"
      );
    }
    expect(getGitHubMentionPathBlockReason("config/settings.json")).toContain(
      "configuration"
    );
    expect(getGitHubMentionPathBlockReason("settings.json")).toContain(
      "configuration"
    );
    for (const path of [
      "content/authors.json",
      "docs/navigation.yaml",
      "data/releases.toml",
    ]) {
      expect(getGitHubMentionPathBlockReason(path)).toBeNull();
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
      "docs/config/settings.json",
      "content/site.config.yaml",
      "data/settings.toml",
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
