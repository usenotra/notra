import { Redis } from "@upstash/redis";

import { IP_CHECKER_LIST_REVALIDATE_SECONDS } from "@/constants/ip-checker";
import type { CrawlerIpList, CrawlerIpListPayload } from "@/types/ip-checker";

const REDIS_KEY_PREFIX = "ip-checker:list:";

const memory = new Map<string, { list: CrawlerIpList; expiresAt: number }>();
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) {
    return redis;
  }
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!(url && token)) {
    return null;
  }
  redis = new Redis({ url, token });
  return redis;
}

export function readListFromMemory(sourceId: string): CrawlerIpList | null {
  const entry = memory.get(sourceId);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.list;
  }
  return null;
}

export function writeListToMemory(list: CrawlerIpList, ttlSeconds: number) {
  memory.set(list.source.id, {
    list,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function readPayloadFromRedis(
  sourceId: string
): Promise<CrawlerIpListPayload | null> {
  const client = getRedis();
  if (!client) {
    return null;
  }
  try {
    return await client.get<CrawlerIpListPayload>(
      `${REDIS_KEY_PREFIX}${sourceId}`
    );
  } catch {
    return null;
  }
}

export async function writePayloadToRedis(
  sourceId: string,
  payload: CrawlerIpListPayload
): Promise<void> {
  const client = getRedis();
  if (!client) {
    return;
  }
  try {
    await client.set(`${REDIS_KEY_PREFIX}${sourceId}`, payload, {
      ex: IP_CHECKER_LIST_REVALIDATE_SECONDS,
    });
  } catch {
    return;
  }
}
