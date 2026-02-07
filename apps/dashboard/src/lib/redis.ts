import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!(url && token)) {
  console.warn(
    "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured. Redis features will be disabled."
  );
}

export const redis = url && token ? new Redis({ url, token }) : null;
