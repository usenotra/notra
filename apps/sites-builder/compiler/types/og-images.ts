import type { SiteEntry } from "@notra/sites-compiler/types/entries";
import type { SiteDiagnostic } from "@notra/sites-core/types/build";
import type { SiteConfig } from "@notra/sites-core/types/site-config";
import type satori from "satori";

export interface WriteOgImagesParams {
  workDir: string;
  config: SiteConfig;
  entries: readonly SiteEntry[];
  publicFiles: readonly string[];
  includeDrafts: boolean;
}

export type OgManifest = Record<string, string>;

export interface OgImagesResult {
  manifest: OgManifest;
  diagnostics: SiteDiagnostic[];
  durationMs: number;
}

export interface OgBackgroundResult {
  dataUri?: string;
  diagnostic?: SiteDiagnostic;
}

export interface OgCardContent {
  eyebrow: string;
  title: string;
  footer: string;
  appearance: "light" | "dark";
  accent: string;
  background?: string;
}

export type SatoriFont = Parameters<typeof satori>[1]["fonts"][number];
