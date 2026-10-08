import { expect, test } from "bun:test";

import type { Site } from "../src/types/sites";
import { defaultSiteConfigContent } from "../src/utils/default-config";
import { buildTargetForDeployment } from "../src/utils/urls";

test("the queued target freezes defaults before later site edits", () => {
  const site = {
    name: "Original site",
    publicOrigin: "https://acme.example",
    mounts: { blog: "/blog" },
    showBranding: true,
  } as Site;
  const target = buildTargetForDeployment({
    site,
    kind: "production",
    previewKey: null,
  });
  site.name = "Changed after enqueue";
  expect(target.defaultConfig?.name).toBe("Original site");
  expect(target.defaultConfig?.blog?.layout).toBe("grid");
  expect(target.defaultConfig?.changelog?.layout).toBe("timeline");
});

test("the editor template is valid normalized JSON without repository writes", () => {
  const content = defaultSiteConfigContent({ name: "Editor defaults" });
  expect(JSON.parse(content)).toMatchObject({
    name: "Editor defaults",
    theme: "notra",
    blog: { layout: "grid" },
    changelog: { layout: "timeline" },
  });
  expect(content.endsWith("\n")).toBe(true);
});
