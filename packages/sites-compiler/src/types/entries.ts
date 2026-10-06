export interface SiteEntry {
  area: "blog" | "changelog";
  slug: string;
  path: string;
  format: "md" | "mdx";
}
