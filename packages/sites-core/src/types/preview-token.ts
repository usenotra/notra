import type { SiteServingState } from "@notra/sites-core/types/deployment";

export interface SitePreviewTokenClaims {
  siteId: string;
  previewKey: string | null;
  exp: number;
  kind: "member" | "share" | "password";
  userId?: string;
  issuedAt?: number;
  passwordVersion?: string;
}

export interface ReadSitePreviewToken {
  claims: SitePreviewTokenClaims;
  expired: boolean;
}

export type PreviewRevocationScope = "signed_out" | "access_lost";

export type RevokedPreviewSessions = SiteServingState["revokedSessions"];
