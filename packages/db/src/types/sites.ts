export interface SiteDomainVerificationRecord {
  type: "CNAME" | "TXT" | "A";
  name: string;
  value: string;
  purpose: "routing" | "ownership" | "certificate";
}

export type SiteJobPayload =
  | Record<string, never>
  | { previewKey: string; generation: number }
  | {
      rebuild: boolean;
      removePreviewsThrough: number | null;
      requestedByUserId: string | null;
    }
  | { reason: string };
