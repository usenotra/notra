import { logError } from "@notra/ai/utils/server-log";
import {
  ingestSocialPostSources,
  ingestSocialPosts,
  isTinybirdConfigured,
} from "@notra/analytics/tinybird/client";
import { toClickHouseDateTime } from "@notra/analytics/utils/datetime";

import type { RecordPublishedSocialPostInput } from "@/types/analytics";

export async function recordPublishedSocialPost(
  input: RecordPublishedSocialPostInput
): Promise<void> {
  if (!isTinybirdConfigured()) {
    return;
  }
  const now = toClickHouseDateTime(new Date());
  try {
    await ingestSocialPosts([
      {
        organization_id: input.organizationId,
        account_id: input.accountId,
        provider: input.provider,
        provider_account_id: input.providerAccountId,
        platform_post_id: input.platformPostId,
        url: input.url,
        content: input.content,
        posted_at: now,
        captured_at: now,
      },
    ]);
    await ingestSocialPostSources([
      {
        organization_id: input.organizationId,
        provider: input.provider,
        provider_account_id: input.providerAccountId,
        platform_post_id: input.platformPostId,
        source: "notra",
        captured_at: now,
      },
    ]);
  } catch (error) {
    logError("[Analytics] Failed to record published post", error);
  }
}
