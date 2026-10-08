import { expect, test } from "bun:test";

import type { SiteRecord } from "../types/sites";
import { siteSettingsFormFromSite, siteSettingsPatch } from "./site-settings";

test("PR comments can be disabled independently of preview builds", () => {
  const site = {
    name: "Docs",
    productionBranch: "main",
    rootDirectory: "",
    mounts: { blog: "/blog" },
    publishMode: "pull_request",
    previewsEnabled: true,
    previewCommentsEnabled: true,
  } as SiteRecord;
  const form = siteSettingsFormFromSite(site);
  expect(form.previewCommentsEnabled).toBe(true);
  expect(siteSettingsPatch(form, site)).toEqual({});
  expect(
    siteSettingsPatch({ ...form, previewCommentsEnabled: false }, site)
  ).toEqual({ previewCommentsEnabled: false });
  expect(site.previewsEnabled).toBe(true);
});
