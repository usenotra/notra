/** DNS record the customer must add, shown in the dashboard. */
export interface SiteDomainVerificationRecord {
  type: "CNAME" | "TXT" | "A";
  name: string;
  value: string;
  purpose: "routing" | "ownership" | "certificate";
}

export type SiteJobPayload =
  | Record<string, never>
  | { previewKey: string }
  | { reason: string };
