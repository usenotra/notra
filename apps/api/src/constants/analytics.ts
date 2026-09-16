import type { ApiSdkPattern } from "../types/analytics";

export const API_SDK_BUCKETS = {
  GEO: "@usenotra/geo",
  FRAMER: "framer",
  RAYCAST: "raycast",
  CURL: "curl",
  NODE: "node",
  OTHER: "other",
} as const;

export const API_AUTH_KINDS = {
  UNKEY: "unkey",
  OAUTH: "oauth",
  FEEDBACK_TOKEN: "feedback_token",
} as const;

export const API_SDK_USER_AGENT_PATTERNS: readonly ApiSdkPattern[] = [
  { sdk: API_SDK_BUCKETS.GEO, pattern: /usenotra\/geo/i },
  { sdk: API_SDK_BUCKETS.FRAMER, pattern: /framer/i },
  { sdk: API_SDK_BUCKETS.RAYCAST, pattern: /raycast/i },
  { sdk: API_SDK_BUCKETS.CURL, pattern: /^curl\//i },
  { sdk: API_SDK_BUCKETS.NODE, pattern: /\b(node|undici|node-fetch|bun)\b/i },
];

export const API_REQUEST_GET_SAMPLE_RATE = 0.1;
export const API_REQUEST_ERROR_STATUS_THRESHOLD = 400;
export const API_ROUTE_ID_UNMATCHED = "unmatched";
export const API_TRIGGER_SOURCE = "api";
export const API_PAYWALL_FEATURES = {
  SUBSCRIPTION: "subscription",
  AI_ANSWERS: "ai_answers",
} as const;
export const API_FEEDBACK_VIA = {
  PUBLIC_SLUG: "public_slug",
  TOKEN: "token",
} as const;
