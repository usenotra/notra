import { normalizeMountPath } from "@notra/sites-core/utils/mounts";

import {
  SITE_DEFAULT_BLOG_PATH,
  SITE_DEFAULT_CHANGELOG_PATH,
} from "@/constants/sites";
import type {
  SiteRecord,
  SiteSettingsForm,
  SiteSettingsPatch,
} from "@/types/sites";

/** `blog/` and `/blog` are the same path; invalid input is left for the server to reject. */
function comparableMountPath(value: string): string {
  try {
    return normalizeMountPath(value);
  } catch {
    return value.trim();
  }
}

export function siteSettingsFormFromSite(site: SiteRecord): SiteSettingsForm {
  return {
    name: site.name,
    productionBranch: site.productionBranch,
    rootDirectory: site.rootDirectory,
    blogEnabled: Boolean(site.mounts.blog),
    blogPath: site.mounts.blog ?? SITE_DEFAULT_BLOG_PATH,
    changelogEnabled: Boolean(site.mounts.changelog),
    changelogPath: site.mounts.changelog ?? SITE_DEFAULT_CHANGELOG_PATH,
    previewsEnabled: site.previewsEnabled,
    previewVisibility: site.previewVisibility,
    publishMode: site.publishMode,
  };
}

/** Only the fields that changed, so untouched settings never trigger a rebuild. */
export function siteSettingsPatch(
  form: SiteSettingsForm,
  site: SiteRecord
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
  if (form.previewsEnabled !== site.previewsEnabled) {
    patch.previewsEnabled = form.previewsEnabled;
  }
  if (form.previewVisibility !== site.previewVisibility) {
    patch.previewVisibility = form.previewVisibility;
  }
  if (form.publishMode !== site.publishMode) {
    patch.publishMode = form.publishMode;
  }
  return patch;
}
