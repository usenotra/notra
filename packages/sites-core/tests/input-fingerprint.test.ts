import { expect, test } from "bun:test";

import type { SiteInputFingerprintParams } from "../src/types/smart-deployments";
import { createDefaultSiteConfig } from "../src/utils/default-config";
import { fingerprintSiteInputs } from "../src/utils/input-fingerprint";

const input: SiteInputFingerprintParams = {
  tree: [
    {
      path: "blog/page.mdx",
      type: "blob",
      mode: "100644",
      sha: "a".repeat(40),
      size: 10,
    },
  ],
  truncated: false,
  rootDirectory: "",
  repositoryId: "repository",
  target: {
    publicOrigin: "https://example.test",
    mounts: { blog: "/blog" },
    noindex: false,
    branding: true,
  },
  includeDrafts: false,
  snapshotId: "snapshot-1",
  year: 2026,
};

test.each([
  "README.md",
  "package.json",
  ".hidden/style.css",
  "node_modules/pkg/index.js",
  "blog/é.mdx",
  "public/image.bmp",
])("ignores unconsumed input %s", async (path) => {
  expect(
    await fingerprintSiteInputs({
      ...input,
      tree: [
        ...input.tree,
        { path, sha: "b".repeat(40), type: "blob", mode: "100644", size: 4 },
      ],
    })
  ).toBe(await fingerprintSiteInputs(input));
});

test.each([
  "src/server.js",
  "src/style.CSS",
  "header.mdx",
  "slots/blog/sidebar.mdx",
  "public/asset.pdf",
  "blog/page.mdx",
])("detects byte changes to %s", async (path) => {
  const first = { ...input, tree: [{ ...input.tree[0], path }] };
  expect(await fingerprintSiteInputs(first)).not.toBe(
    await fingerprintSiteInputs({
      ...first,
      tree: [{ ...first.tree[0], sha: "b".repeat(40) }],
    })
  );
});

test("renames and deletions change the input fingerprint", async () => {
  expect(await fingerprintSiteInputs(input)).not.toBe(
    await fingerprintSiteInputs({ ...input, tree: [] })
  );
  expect(await fingerprintSiteInputs(input)).not.toBe(
    await fingerprintSiteInputs({
      ...input,
      tree: [{ ...input.tree[0], path: "blog/renamed.mdx" }],
    })
  );
});

test("root scoping uses a directory boundary", async () => {
  const nested = {
    ...input,
    rootDirectory: "docs",
    tree: [
      { path: "docs", type: "tree", sha: "c".repeat(40) },
      { ...input.tree[0], path: "docs/blog/page.mdx" },
    ],
  };
  expect(await fingerprintSiteInputs(nested)).toBe(
    await fingerprintSiteInputs({
      ...nested,
      tree: [
        ...nested.tree,
        { ...input.tree[0], path: "docs-other/blog/page.mdx" },
      ],
    })
  );
  expect(await fingerprintSiteInputs({ ...nested, tree: [] })).toBeNull();
});

test("config, builder snapshot, drafts and calendar year invalidate equality", async () => {
  const original = await fingerprintSiteInputs(input);
  for (const patch of [
    { snapshotId: "snapshot-2" },
    { year: 2027 },
    { includeDrafts: true },
    { repositoryId: "other" },
    {
      target: {
        ...input.target,
        defaultConfig: createDefaultSiteConfig("Changed"),
      },
    },
  ]) {
    expect(await fingerprintSiteInputs({ ...input, ...patch })).not.toBe(
      original
    );
  }
});

test("tree order and object key order do not change the fingerprint", async () => {
  const tree = [...input.tree, { ...input.tree[0], path: "public/image.png" }];
  expect(await fingerprintSiteInputs({ ...input, tree })).toBe(
    await fingerprintSiteInputs({
      ...input,
      tree: [...tree].reverse(),
      target: {
        noindex: false,
        branding: true,
        mounts: { blog: "/blog" },
        publicOrigin: "https://example.test",
      },
    })
  );
});

test("truncated, incomplete, symlink and excessive source trees require a build", async () => {
  expect(await fingerprintSiteInputs({ ...input, truncated: true })).toBeNull();
  expect(
    await fingerprintSiteInputs({
      ...input,
      tree: [{ ...input.tree[0], sha: undefined }],
    })
  ).toBeNull();
  expect(
    await fingerprintSiteInputs({
      ...input,
      tree: [{ ...input.tree[0], mode: "120000" }],
    })
  ).toBeNull();
  expect(
    await fingerprintSiteInputs({
      ...input,
      tree: [{ ...input.tree[0], size: 26 * 1024 * 1024 }],
    })
  ).toBeNull();
});
test("archive transformations require a build even outside the site root", async () => {
  for (const path of [".gitattributes", ".lfsconfig", "other/.gitattributes"]) {
    expect(
      await fingerprintSiteInputs({
        ...input,
        tree: [
          ...input.tree,
          { path, sha: "b".repeat(40), type: "blob", mode: "100644", size: 1 },
        ],
      })
    ).toBeNull();
  }
});
