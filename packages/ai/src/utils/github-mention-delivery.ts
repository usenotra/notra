import {
  CLAIM_GITHUB_MENTION_DELIVERY,
  COMPLETE_GITHUB_MENTION_DELIVERY,
  GITHUB_MENTION_DELIVERY_TTL_SECONDS,
} from "@notra/ai/constants/github-mention-delivery";
import { redis } from "@notra/ai/utils/redis";

export async function claimGitHubMentionDelivery(
  deliveryId: string,
  runId: string
) {
  if (!redis) {
    throw new Error("GitHub mention delivery deduplication requires Redis");
  }
  return (
    (await redis.eval(
      CLAIM_GITHUB_MENTION_DELIVERY,
      [`github-mention:delivery:${deliveryId}`],
      [runId]
    )) === 1
  );
}

export async function completeGitHubMentionDelivery(
  deliveryId: string,
  runId: string
) {
  if (!redis) {
    throw new Error("GitHub mention delivery deduplication requires Redis");
  }
  await redis.eval(
    COMPLETE_GITHUB_MENTION_DELIVERY,
    [`github-mention:delivery:${deliveryId}`],
    [runId, GITHUB_MENTION_DELIVERY_TTL_SECONDS]
  );
}
