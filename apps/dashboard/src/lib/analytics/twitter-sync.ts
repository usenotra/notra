import type {
  SocialAccountStatsRow,
  SocialPostRow,
  SocialPostStatsRow,
} from "@notra/analytics/tinybird/datasources";

import {
  DAY_IN_MS,
  TWITTER_TIMELINE_MAX_PAGES,
  TWITTER_TIMELINE_MAX_RESULTS,
  TWITTER_TIMELINE_WINDOW_DAYS,
  TWITTER_TWEET_FIELDS,
  TWITTER_USER_BATCH_SIZE,
  TWITTER_USER_FIELDS,
} from "@/lib/analytics/constants";
import {
  buildTweetPostRow,
  buildTweetStatsRow,
  buildTwitterAccountStatsRow,
} from "@/lib/analytics/rows";
import type {
  SyncableSocialAccount,
  TwitterBatchUser,
  TwitterBatchUsersResponse,
  TwitterTimelineResponse,
} from "@/types/analytics";
import { twitterAppFetch } from "@/utils/twitter-fetcher";

function isTwitterAnalyticsConfigured(): boolean {
  return Boolean(process.env.TWITTER_BEARER_TOKEN);
}

async function fetchTwitterUsersBatch(
  usernames: string[]
): Promise<TwitterBatchUser[]> {
  const users: TwitterBatchUser[] = [];
  for (
    let index = 0;
    index < usernames.length;
    index += TWITTER_USER_BATCH_SIZE
  ) {
    const batch = usernames.slice(index, index + TWITTER_USER_BATCH_SIZE);
    const params = new URLSearchParams({
      usernames: batch.join(","),
      "user.fields": TWITTER_USER_FIELDS,
    });
    const response = await twitterAppFetch(
      `https://api.x.com/2/users/by?${params.toString()}`
    );
    if (!response.ok) {
      continue;
    }
    const json: TwitterBatchUsersResponse = await response.json();
    users.push(...(json.data ?? []));
  }
  return users;
}

async function fetchUserTweets(userId: string, startTime: Date) {
  const tweets: TwitterTimelineResponse["data"] = [];
  let paginationToken: string | undefined;

  for (let page = 0; page < TWITTER_TIMELINE_MAX_PAGES; page += 1) {
    const params = new URLSearchParams({
      max_results: String(TWITTER_TIMELINE_MAX_RESULTS),
      exclude: "replies,retweets",
      start_time: startTime.toISOString(),
      "tweet.fields": TWITTER_TWEET_FIELDS,
    });
    if (paginationToken) {
      params.set("pagination_token", paginationToken);
    }
    const response = await twitterAppFetch(
      `https://api.x.com/2/users/${encodeURIComponent(userId)}/tweets?${params.toString()}`
    );
    if (!response.ok) {
      break;
    }
    const json: TwitterTimelineResponse = await response.json();
    tweets.push(...(json.data ?? []));
    paginationToken = json.meta?.next_token;
    if (!paginationToken) {
      break;
    }
  }

  return tweets;
}

export interface TwitterSyncRows {
  accountStats: SocialAccountStatsRow[];
  posts: SocialPostRow[];
  postStats: SocialPostStatsRow[];
}

export async function collectTwitterRows(
  accounts: SyncableSocialAccount[],
  capturedAt: Date
): Promise<TwitterSyncRows> {
  const rows: TwitterSyncRows = { accountStats: [], posts: [], postStats: [] };
  if (accounts.length === 0 || !isTwitterAnalyticsConfigured()) {
    return rows;
  }

  const users = await fetchTwitterUsersBatch([
    ...new Set(accounts.map((account) => account.username.toLowerCase())),
  ]);
  const usersByUsername = new Map(
    users.map((user) => [user.username.toLowerCase(), user])
  );
  const timelineStart = new Date(
    capturedAt.getTime() - TWITTER_TIMELINE_WINDOW_DAYS * DAY_IN_MS
  );
  const tweetsByUser = new Map<string, ReturnType<typeof fetchUserTweets>>();

  const timelines = await Promise.all(
    accounts.map(async (account) => {
      const user = usersByUsername.get(account.username.toLowerCase());
      if (!user) {
        return null;
      }
      let pendingTweets = tweetsByUser.get(user.id);
      if (!pendingTweets) {
        pendingTweets = fetchUserTweets(user.id, timelineStart);
        tweetsByUser.set(user.id, pendingTweets);
      }
      const tweets = await pendingTweets;
      return { account, user, tweets };
    })
  );

  for (const timeline of timelines) {
    if (!timeline) {
      continue;
    }
    rows.accountStats.push(
      buildTwitterAccountStatsRow(timeline.account, timeline.user, capturedAt)
    );
    for (const tweet of timeline.tweets) {
      rows.posts.push(buildTweetPostRow(timeline.account, tweet, capturedAt));
      rows.postStats.push(
        buildTweetStatsRow(timeline.account, tweet, capturedAt)
      );
    }
  }

  return rows;
}
