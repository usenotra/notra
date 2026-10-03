export interface SitePreviewTokenClaims {
  siteId: string;
  /** `null` grants every preview of the site (org member session). */
  previewKey: string | null;
  /** Unix seconds. */
  exp: number;
  /** `member` for dashboard sessions, `share` for share links. */
  kind: "member" | "share";
}
