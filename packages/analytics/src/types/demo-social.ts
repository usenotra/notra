/** A social account the demo generates analytics for. */
export interface DemoSocialAccount {
  provider: string;
  providerAccountId: string;
  username: string;
  displayName: string | null;
  profileImageUrl: string | null;
  verified: boolean;
  /** Connected accounts are the visitor's own; tracked ones are benchmarks. */
  kind: "connected" | "tracked";
}

/** Lists an organization's demo social accounts (connected and tracked). */
export type DemoSocialAccountsProvider = (
  organizationId: string
) => Promise<DemoSocialAccount[]>;

export interface DemoSocialPost {
  provider: string;
  providerAccountId: string;
  platformPostId: string;
  content: string;
  url: string | null;
  postedAt: Date;
  impressions: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  bookmarks: number;
  /** Published through Notra (feeds the adoption marker). */
  viaNotra: boolean;
}

/** Union of every social pipe parameter the demo mirrors. */
export interface DemoSocialParams {
  organization_id: string;
  days?: number;
  timezone?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  post_ids?: string[];
}
