import { basename } from "node:path";

import { siteConfigSchema } from "@notra/sites-core/schemas/site-config";
import type { SiteBuildRequest } from "@notra/sites-core/types/build";
import { createDefaultSiteConfig } from "@notra/sites-core/utils/default-config";
import {
  listMountedAreas,
  normalizeSiteMounts,
} from "@notra/sites-core/utils/mounts";

export function localDefaultConfig(
  siteRoot: string,
  target?: SiteBuildRequest
) {
  return (
    target?.defaultConfig ??
    createDefaultSiteConfig(
      basename(siteRoot)
        .trim()
        .slice(0, siteConfigSchema.shape.name.maxLength ?? 80)
        .trim() || "Local site"
    )
  );
}

export function localPreviewArea(target?: SiteBuildRequest, area?: string) {
  const mounts = normalizeSiteMounts(
    target?.mounts ?? { blog: "/blog", changelog: "/changelog" }
  );
  const mounted = listMountedAreas(mounts);
  const selected =
    area === undefined
      ? mounted[0]
      : mounted.find((entry) => entry.area === area);
  if (!selected) {
    throw new Error(
      `Cannot preview area "${area}": choose an enabled blog or changelog area`
    );
  }
  return { mounts, selected };
}
