export type { SiteDiagnostic } from "@notra/sites-core/schemas/build";

export interface SiteSourceFile {
  /** Relative to the site root, forward slashes, no leading slash. */
  path: string;
  size: number;
}

export interface SiteEntry {
  area: "blog" | "changelog";
  /** URL slug inside the area, e.g. `2026/launch` for `blog/2026/launch.mdx`. */
  slug: string;
  path: string;
  format: "md" | "mdx";
}
