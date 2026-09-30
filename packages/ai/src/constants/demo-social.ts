/** Posts published from the demo, kept per organization in Redis. */
export const DEMO_PUBLISHED_POSTS_KEY_PREFIX = "demo:social-published:";
/** Newest posts kept per organization. */
export const DEMO_PUBLISHED_POSTS_MAX = 50;
/** Outlives the longest sandbox (7 days); Redis drops the rest. */
export const DEMO_PUBLISHED_POSTS_TTL_SECONDS = 8 * 24 * 60 * 60;
