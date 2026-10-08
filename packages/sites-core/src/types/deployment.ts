import type {
  siteAreaSchema,
  siteBuildTargetSchema,
  siteHostRecordSchema,
  siteManifestFileSchema,
  siteManifestSchema,
  siteMountsSchema,
  sitePreviewPasswordSchema,
  sitePreviewPointerSchema,
  siteServingStateSchema,
} from "@notra/sites-core/schemas/deployment";
import type { z } from "zod";

export type SiteArea = z.infer<typeof siteAreaSchema>;
export type SiteMounts = z.infer<typeof siteMountsSchema>;
export type SiteBuildTarget = z.infer<typeof siteBuildTargetSchema>;
export type SiteManifestFile = z.infer<typeof siteManifestFileSchema>;
export type SiteManifest = z.infer<typeof siteManifestSchema>;
export type SiteServingState = z.infer<typeof siteServingStateSchema>;
export type SitePreviewPointer = z.infer<typeof sitePreviewPointerSchema>;
export type SiteHostRecord = z.infer<typeof siteHostRecordSchema>;
export type SitePreviewPassword = z.infer<typeof sitePreviewPasswordSchema>;

export interface SiteMountedArea {
  area: SiteArea;
  mount: string;
}
