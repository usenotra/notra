import { describe, expect, test } from "bun:test";

import {
  queryDemoSocialPipe,
  setDemoSocialSourceProvider,
} from "@notra/analytics/tinybird/demo-social";
import type { DemoSocialAccount } from "@notra/analytics/types/demo-social";

const accounts: DemoSocialAccount[] = [
  {
    provider: "twitter",
    providerAccountId: "demo-twitter-fieldnote",
    username: "fieldnote",
    displayName: "Fieldnote",
    profileImageUrl: null,
    verified: true,
    kind: "connected",
  },
  {
    provider: "twitter",
    providerAccountId: "demo-twitter-quillboard",
    username: "quillboard",
    displayName: "Quillboard",
    profileImageUrl: null,
    verified: true,
    kind: "tracked",
  },
];

setDemoSocialSourceProvider(async () => ({
  accounts,
  published: [
    {
      provider: "twitter",
      providerAccountId: "demo-twitter-fieldnote",
      platformPostId: "demo-published-1",
      content: "Published from the demo",
      postedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    },
  ],
}));

async function rows<T>(
  pipe: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const result = await queryDemoSocialPipe<T>(pipe, {
    organization_id: "org-demo",
    ...params,
  });
  if (!result) {
    throw new Error(`${pipe} is not mirrored`);
  }
  return result.data;
}

describe("demo social pipes", () => {
  test("overview covers every account with followers and engagement", async () => {
    const overview = await rows<{
      provider_account_id: string;
      followers_count: number;
      impressions: number;
    }>("social_overview");
    expect(overview.map((row) => row.provider_account_id).toSorted()).toEqual(
      accounts.map((account) => account.providerAccountId).toSorted()
    );
    expect(overview.every((row) => row.followers_count > 0)).toBe(true);
    expect(overview.every((row) => row.impressions > 0)).toBe(true);
  });

  test("history is stable between calls", async () => {
    const first = await rows("engagement_timeseries", { days: 30 });
    const second = await rows("engagement_timeseries", { days: 30 });
    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);
  });

  test("top posts rank every account by engagement", async () => {
    const top = await rows<{ provider_account_id: string; engagement: number }>(
      "top_posts",
      { limit: 20 }
    );
    expect(top).toHaveLength(20);
    expect(new Set(top.map((row) => row.provider_account_id)).size).toBe(2);
    expect(top[0]?.engagement).toBeGreaterThanOrEqual(top[19]?.engagement ?? 0);
  });

  test("published posts show up with generated stats", async () => {
    const lookup = await rows<{ content: string; impressions: number }>(
      "post_metrics_lookup",
      { post_ids: ["demo-published-1"] }
    );
    expect(lookup).toHaveLength(1);
    expect(lookup[0]?.content).toBe("Published from the demo");
    expect(lookup[0]?.impressions).toBeGreaterThan(0);
  });

  test("leaderboard compares the current and previous window", async () => {
    const board = await rows<{ posts: number; prev_posts: number }>(
      "account_leaderboard",
      { days: 30 }
    );
    expect(board.length).toBe(2);
    expect(board.every((row) => row.posts > 0 && row.prev_posts > 0)).toBe(
      true
    );
  });

  test("follower growth has one point per account and day", async () => {
    const growth = await rows<{ day: string; followers_count: number }>(
      "follower_growth",
      { days: 30, timezone: "Europe/Berlin" }
    );
    expect(growth.length).toBeGreaterThanOrEqual(accounts.length * 29);
    const today = new Date().toISOString().slice(0, 10);
    expect(growth.every((row) => row.day <= today)).toBe(true);
  });

  test("posting performance uses ISO weekdays", async () => {
    const slots = await rows<{ weekday: number; hour: number }>(
      "posting_performance"
    );
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((slot) => slot.weekday >= 1 && slot.weekday <= 7)).toBe(
      true
    );
  });

  test("adoption marks the first post written with Notra", async () => {
    const [adoption] = await rows<{
      first_notra_post_at: string | null;
      notra_posts: number;
    }>("notra_adoption");
    expect(adoption?.first_notra_post_at).not.toBeNull();
    expect(adoption?.notra_posts).toBeGreaterThan(0);
  });
});
