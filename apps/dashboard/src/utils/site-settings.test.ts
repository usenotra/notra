import { expect, test } from "bun:test";

import { updateSiteInputSchema } from "@notra/schemas/dashboard/sites";

import type { SiteSettingsSource } from "@/types/sites";
import {
  siteSettingsFormFromSite,
  siteSettingsPatch,
} from "@/utils/site-settings";

const site: SiteSettingsSource = {
  name: "Synthetic",
  productionBranch: "main",
  rootDirectory: "docs",
  mounts: { blog: "/blog" },
  publishMode: "pull_request",
  previewCommentsEnabled: true,
  smartDeployments: true,
};

test("unchanged settings send no mutation, while disabling smart deployments preserves false", () => {
  const form = siteSettingsFormFromSite(site);
  expect(form.smartDeployments).toBe(true);
  expect(siteSettingsPatch(form, site)).toEqual({});
  const patch = siteSettingsPatch({ ...form, smartDeployments: false }, site);
  expect(patch).toEqual({ smartDeployments: false });
  expect(
    updateSiteInputSchema.parse({
      organizationId: "org",
      siteId: "site_synthetic",
      ...patch,
    }).smartDeployments
  ).toBe(false);
});

test("saved disabled settings can be reset or reenabled without unrelated changes", () => {
  const saved = { ...site, smartDeployments: false };
  const form = siteSettingsFormFromSite(saved);
  expect(form.smartDeployments).toBe(false);
  expect(siteSettingsPatch(form, saved)).toEqual({});
  expect(siteSettingsPatch({ ...form, smartDeployments: true }, saved)).toEqual(
    { smartDeployments: true }
  );
  expect(
    updateSiteInputSchema.safeParse({
      organizationId: "org",
      siteId: "site_synthetic",
      smartDeployments: "false",
    }).success
  ).toBe(false);
});
