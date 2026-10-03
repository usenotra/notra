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

/** A post the visitor "published" from the demo; its stats are generated. */
export interface DemoPublishedPost {
  provider: string;
  providerAccountId: string;
  platformPostId: string;
  content: string;
  /** ISO timestamp. */
  postedAt: string;
}

export interface DemoSocialSource {
  /** Connected and tracked accounts. */
  accounts: DemoSocialAccount[];
  published: DemoPublishedPost[];
}

/** Loads an organization's demo social accounts and published posts. */
export type DemoSocialSourceProvider = (
  organizationId: string
) => Promise<DemoSocialSource>;

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
