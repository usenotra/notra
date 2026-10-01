/** Posts published from the demo, kept per organization in Redis. */
export const DEMO_PUBLISHED_POSTS_KEY_PREFIX = "demo:social-published:";
/** Newest posts kept per organization. */
export const DEMO_PUBLISHED_POSTS_MAX = 50;
/** Outlives the longest sandbox (a day); Redis drops the rest. */
export const DEMO_PUBLISHED_POSTS_TTL_SECONDS = 25 * 60 * 60;
