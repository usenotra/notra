import { normalizeMountPath } from "@notra/sites-core/utils/mounts";

import {
  SITE_DEFAULT_BLOG_PATH,
  SITE_DEFAULT_CHANGELOG_PATH,
} from "@/constants/sites";
import type {
  SiteSettingsSource,
  SiteSettingsForm,
  SiteSettingsPatch,
} from "@/types/sites";

function comparableMountPath(value: string): string {
  try {
    return normalizeMountPath(value);
  } catch {
    return value.trim();
  }
}

export function siteSettingsFormFromSite(
  site: SiteSettingsSource
): SiteSettingsForm {
  return {
    name: site.name,
    productionBranch: site.productionBranch,
    rootDirectory: site.rootDirectory,
    blogEnabled: Boolean(site.mounts.blog),
    blogPath: site.mounts.blog ?? SITE_DEFAULT_BLOG_PATH,
    changelogEnabled: Boolean(site.mounts.changelog),
    changelogPath: site.mounts.changelog ?? SITE_DEFAULT_CHANGELOG_PATH,
    publishMode: site.publishMode,
    previewCommentsEnabled: site.previewCommentsEnabled,
    smartDeployments: site.smartDeployments,
  };
}

export function siteSettingsPatch(
  form: SiteSettingsForm,
  site: SiteSettingsSource
): SiteSettingsPatch {
  const patch: SiteSettingsPatch = {};
  const name = form.name.trim();
  if (name !== site.name) {
    patch.name = name;
  }
  const branch = form.productionBranch.trim();
  if (branch !== site.productionBranch) {
    patch.productionBranch = branch;
  }
  const root = form.rootDirectory.trim();
  if (root !== site.rootDirectory) {
    patch.rootDirectory = root;
  }
  const mounts = {
    blog: form.blogEnabled ? comparableMountPath(form.blogPath) : undefined,
    changelog: form.changelogEnabled
      ? comparableMountPath(form.changelogPath)
      : undefined,
  };
  if (
    mounts.blog !== site.mounts.blog ||
    mounts.changelog !== site.mounts.changelog
  ) {
    patch.mounts = mounts;
  }
  if (form.publishMode !== site.publishMode) {
    patch.publishMode = form.publishMode;
  }
  if (form.previewCommentsEnabled !== site.previewCommentsEnabled) {
    patch.previewCommentsEnabled = form.previewCommentsEnabled;
  }
  if (form.smartDeployments !== site.smartDeployments) {
    patch.smartDeployments = form.smartDeployments;
  }
  return patch;
}
