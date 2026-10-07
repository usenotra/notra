import { expect, test } from "bun:test";

import { siteBuildRequestSchema } from "../src/schemas/build";
import { siteBuildTargetSchema } from "../src/schemas/deployment";
import { hashBuildTarget } from "../src/utils/build-target";
import { createDefaultSiteConfig } from "../src/utils/default-config";

test("default snapshots include normalized theme and both area settings", () => {
  const config = createDefaultSiteConfig("Frozen Acme");
  expect(config.name).toBe("Frozen Acme");
  expect(config.blog?.layout).toBe("grid");
  expect(config.changelog?.layout).toBe("timeline");
  expect(config.theme).toBe("notra");
  expect(config.security.contentSecurityPolicy).toBe(true);
  const target = siteBuildTargetSchema.parse({
    publicOrigin: "https://acme.example",
    mounts: { blog: "/blog" },
    noindex: false,
    defaultConfig: config,
  });
  const request = siteBuildRequestSchema.parse({
    ...target,
    siteId: "site_acme",
    deploymentId: "dep_acme",
  });
  expect(request.defaultConfig).toEqual(config);
});

test("appearance defaults do not change legacy URL compatibility hashes", async () => {
  const legacy = {
    publicOrigin: "https://acme.example",
    mounts: { blog: "/blog" },
    noindex: false,
    branding: true,
  };
  const snapshot = createDefaultSiteConfig("Frozen Acme");
  expect(await hashBuildTarget({ ...legacy, defaultConfig: snapshot })).toBe(
    await hashBuildTarget(legacy)
  );
  snapshot.colors.primary = "#123456";
  expect(await hashBuildTarget({ ...legacy, defaultConfig: snapshot })).toBe(
    await hashBuildTarget(legacy)
  );
});

test("each default snapshot is independent and invalid names remain invalid", () => {
  const one = createDefaultSiteConfig("One");
  const two = createDefaultSiteConfig("Two");
  one.name = "Changed";
  one.colors.primary = "#123456";
  expect(two.name).toBe("Two");
  expect(two.colors.primary).not.toBe("#123456");
  expect(() => createDefaultSiteConfig("")).toThrow();
});
