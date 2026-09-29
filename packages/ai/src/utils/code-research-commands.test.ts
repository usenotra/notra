import { describe, expect, test } from "bun:test";

import {
  CODE_RESEARCH_EXIT_MARKER,
  CODE_RESEARCH_REPO_DIR,
} from "@notra/ai/constants/code-research";

import {
  buildCheckoutScript,
  buildCloneScript,
  buildListFilesScript,
  buildReadFileScript,
  buildSearchScript,
  globToRegExp,
  isDeniedRepoPath,
  normalizeRepoPath,
  parseCommandOutput,
  parseListFiles,
  parseSearchMatches,
  parseShowChange,
  redactSecrets,
  shellQuote,
  stripDeniedDiffFiles,
} from "./code-research-commands";

const repository = {
  integrationId: "int_1",
  organizationId: "org_1",
  owner: "acme",
  repo: "app",
  defaultBranch: "main",
};

describe("shellQuote", () => {
  test("keeps command substitution and quotes inert", () => {
    expect(shellQuote("$(rm -rf /)'; echo pwned")).toBe(
      "'$(rm -rf /)'\\''; echo pwned'"
    );
  });

  test("rejects NUL bytes", () => {
    expect(() => shellQuote("a\0b")).toThrow();
  });
});

describe("normalizeRepoPath", () => {
  test("normalizes relative paths", () => {
    expect(normalizeRepoPath("./apps//web/src/")).toBe("apps/web/src");
    expect(normalizeRepoPath(".")).toBe("");
    expect(normalizeRepoPath(undefined)).toBe("");
    expect(normalizeRepoPath("docs/../README.md")).toBe("README.md");
  });

  test("rejects paths outside the repository", () => {
    expect(() => normalizeRepoPath("../secrets")).toThrow();
    expect(() => normalizeRepoPath("docs/../../etc/passwd")).toThrow();
    expect(() => normalizeRepoPath("/etc/passwd")).toThrow();
  });
});

describe("isDeniedRepoPath", () => {
  test("blocks secret-bearing files", () => {
    for (const path of [
      ".env",
      "apps/web/.env.local",
      ".env.production",
      "deploy/key.pem",
      "config/credentials.json",
      "ops/secrets.yaml",
      ".npmrc",
      "home/id_ed25519",
    ]) {
      expect(isDeniedRepoPath(path)).toBe(true);
    }
  });

  test("allows templates and normal code", () => {
    for (const path of [
      ".env.example",
      "apps/web/.env.sample",
      "src/env.ts",
      "src/keyboard.ts",
      "docs/tokens.md",
    ]) {
      expect(isDeniedRepoPath(path)).toBe(false);
    }
  });
});

describe("redactSecrets", () => {
  test("redacts literal credentials but keeps key names", () => {
    const input = [
      'const apiKey = "sk_live_1234567890abcdefghij";',
      "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz0123456789",
      "export STRIPE_SECRET_KEY=sk_test_abcdefghijklmnop",
      "-----BEGIN RSA PRIVATE KEY-----\nMIIE\n-----END RSA PRIVATE KEY-----",
    ].join("\n");
    const output = redactSecrets(input);
    expect(output).toContain('const apiKey = "[redacted]"');
    expect(output).toContain("GITHUB_TOKEN=[redacted]");
    expect(output).toContain("export STRIPE_SECRET_KEY=[redacted]");
    expect(output).not.toContain("ghp_");
    expect(output).not.toContain("MIIE");
  });

  test("leaves ordinary code alone", () => {
    const code =
      "const token = await getInstallationToken(installationId);\nconst tokenCount = countTokens(prompt);";
    expect(redactSecrets(code)).toBe(code);
  });
});

describe("parseCommandOutput", () => {
  test("reads the exit trailer", () => {
    expect(
      parseCommandOutput(`hello\nworld\n\n${CODE_RESEARCH_EXIT_MARKER}3`, 0)
    ).toEqual({ exitCode: 3, output: "hello\nworld\n" });
  });

  test("falls back to the box exit code without a trailer", () => {
    expect(parseCommandOutput("boom", 2)).toEqual({
      exitCode: 2,
      output: "boom",
    });
  });
});

describe("parseSearchMatches", () => {
  test("hides denied files, redacts, and caps", () => {
    const output = [
      "src/a.ts:3:const x = 1;",
      ".env:1:API_KEY=abcdefghijklmnopqrstuvwxyz",
      'src/b.ts:10:const secret = "abcdefghijklmnopqrst";',
      "src/c.ts:1:third",
    ].join("\n");
    const parsed = parseSearchMatches(output, 2);
    expect(parsed.matches).toEqual([
      { path: "src/a.ts", line: 3, text: "const x = 1;" },
      { path: "src/b.ts", line: 10, text: 'const secret = "[redacted]";' },
    ]);
    expect(parsed.truncated).toBe(true);
    expect(parsed.hiddenPaths).toBe(1);
  });
});

describe("parseListFiles", () => {
  test("collapses large listings into directories", () => {
    const files = [
      "apps/web/a.ts",
      "apps/web/b.ts",
      "apps/api/c.ts",
      "README.md",
    ];
    const parsed = parseListFiles(files.join("\n"), "", 2);
    expect(parsed.truncated).toBe(true);
    expect(parsed.files).toEqual(["README.md"]);
    expect(parsed.directories).toEqual([{ path: "apps", files: 3 }]);
  });

  test("returns small listings as files", () => {
    const parsed = parseListFiles("src/a.ts\nsrc/b.ts", "src", 10);
    expect(parsed.files).toEqual(["src/a.ts", "src/b.ts"]);
    expect(parsed.truncated).toBe(false);
  });

  test("filters by glob relative to the listed path", () => {
    const listing = [
      "apps/web/src/flag.ts",
      "apps/web/src/lib/geo/flag.ts",
      "apps/web/src/lib/geo/flag.test.ts",
      "apps/web/README.md",
    ].join("\n");
    expect(parseListFiles(listing, "apps/web", 10, "**/flag.ts").files).toEqual(
      ["apps/web/src/flag.ts", "apps/web/src/lib/geo/flag.ts"]
    );
    expect(parseListFiles(listing, "apps/web", 10, "*.md").files).toEqual([
      "apps/web/README.md",
    ]);
  });
});

describe("globToRegExp", () => {
  test("keeps * inside one directory and lets ** cross them", () => {
    expect(globToRegExp("*.ts").test("a.ts")).toBe(true);
    expect(globToRegExp("*.ts").test("dir/a.ts")).toBe(false);
    expect(globToRegExp("**/*.ts").test("a/b/c.ts")).toBe(true);
    expect(globToRegExp("src/?.ts").test("src/a.ts")).toBe(true);
    expect(globToRegExp("a+b.(x)").test("a+b.(x)")).toBe(true);
  });
});

describe("stripDeniedDiffFiles", () => {
  test("drops whole diff blocks of denied files", () => {
    const patch = [
      "diff --git a/src/a.ts b/src/a.ts",
      "+ok",
      "diff --git a/.env.production b/.env.production",
      "+DATABASE_URL=postgres://secret",
      "diff --git a/src/b.ts b/src/b.ts",
      "+also ok",
    ].join("\n");
    const result = stripDeniedDiffFiles(patch);
    expect(result.hiddenFiles).toEqual([".env.production"]);
    expect(result.patch).not.toContain("postgres://");
    expect(result.patch).toContain("+also ok");
  });

  test("hides a secret file renamed to a harmless name", () => {
    const patch = [
      "diff --git a/.env b/config.txt",
      "similarity index 90%",
      "rename from .env",
      "rename to config.txt",
      "-API_TOKEN=plain",
    ].join("\n");
    const result = stripDeniedDiffFiles(patch);
    expect(result.hiddenFiles).toEqual([".env"]);
    expect(result.patch).not.toContain("API_TOKEN");
  });
});

describe("parseShowChange", () => {
  test("drops stat lines of denied files, including renames", () => {
    const output = [
      `${"a".repeat(40)}\u001fJan\u001f2026-09-29\u001ffeat: thing`,
      " src/a.ts                 | 4 ++--",
      " .env.production          | 2 +-",
      " config/{.env => app.txt} | 1 +",
      " 3 files changed, 4 insertions(+), 3 deletions(-)",
      "@@PATCH",
      "diff --git a/src/a.ts b/src/a.ts",
      "+ok",
    ].join("\n");
    const parsed = parseShowChange(output);
    expect(parsed.summary).toContain("src/a.ts");
    expect(parsed.summary).not.toContain(".env");
    expect(parsed.patch).toContain("+ok");
  });
});

describe("git scripts", () => {
  test("clone never embeds credentials and targets the repo dir", () => {
    const script = buildCloneScript(repository);
    expect(script).toContain("'https://github.com/acme/app.git'");
    expect(script).toContain("credential.helper=");
    expect(script).toContain(`'${CODE_RESEARCH_REPO_DIR}'`);
    expect(script).not.toContain("x-access-token");
  });

  test("rejects option-like and traversal refs", () => {
    expect(() =>
      buildCheckoutScript({ kind: "branch", branch: "--upload-pack=x" }, "main")
    ).toThrow();
    expect(() =>
      buildCheckoutScript({ kind: "branch", branch: "a..b" }, "main")
    ).toThrow();
    expect(() =>
      buildCloneScript({ ...repository, owner: "acme;rm" })
    ).toThrow();
  });

  test("requires full SHAs for commit checkouts", () => {
    expect(() =>
      buildCheckoutScript({ kind: "commit", sha: "abc1234" }, "main")
    ).toThrow();
    expect(
      buildCheckoutScript({ kind: "commit", sha: "a".repeat(40) }, "main")
    ).toContain("checkout --quiet --detach");
  });

  test("pins reads to the recorded commit", () => {
    const sha = "b".repeat(40);
    expect(buildReadFileScript(sha, "src/a.ts", 1, 10)).toContain(
      `'${sha}:src/a.ts'`
    );
    expect(buildListFilesScript(sha, "apps")).toContain(
      `ls-tree -r --name-only '${sha}'`
    );
    expect(() => buildReadFileScript("HEAD", "src/a.ts", 1, 10)).toThrow();
  });

  test("keeps git grep's exit status past the line cap", () => {
    const script = buildSearchScript({
      sha: "c".repeat(40),
      query: "foo(",
      regex: true,
      ignoreCase: false,
      path: "",
      maxPerFile: 3,
    });
    expect(script).toContain('> "$t"');
    expect(script).toContain('exit "$c"');
  });

  test("fetches pull request heads into a private ref", () => {
    expect(
      buildCheckoutScript({ kind: "pull_request", number: 42 }, "main")
    ).toContain("+refs/pull/42/head:refs/remotes/origin/pr/42");
  });
});
