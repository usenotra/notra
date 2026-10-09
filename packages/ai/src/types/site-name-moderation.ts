export interface ModerateSiteNameParams {
  organizationId: string;
  organizationName: string;
  name: string;
  address: string;
}

export type SiteNameModerationVerdict = "offensive" | "impersonation" | null;
