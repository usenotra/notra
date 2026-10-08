const DAY_MS = 86_400_000;

export const GEO_RECAP_DAY_MS = DAY_MS;

/** Weekly recap goes out on Monday (UTC) and covers Monday–Sunday. */
export const GEO_RECAP_WEEKLY_SEND_DAY = 1;
export const GEO_RECAP_WEEK_DAYS = 7;

/** Fewer answers than this per prompt and engine is too thin to compare. */
export const GEO_RECAP_MIN_CHECKS_PER_PERIOD = 3;

/**
 * A prompt counts as gained or lost when its mention rate crosses 50% and
 * moves at least this much, e.g. 1 of 7 answers → 5 of 7.
 */
export const GEO_RECAP_MIN_RATE_SWING = 0.5;
export const GEO_RECAP_MENTIONED_RATE = 0.5;

/** Average rank must move this many places to be listed. */
export const GEO_RECAP_MIN_RANK_SHIFT = 1.5;

/** Visibility or competitor share must move this much to be news. */
export const GEO_RECAP_MIN_SHARE_POINTS = 3;
/** Competitor shares wobble more (many brands per answer), so a higher bar. */
export const GEO_RECAP_MIN_COMPETITOR_POINTS = 5;

export const GEO_RECAP_MAX_ITEMS = 6;
export const GEO_RECAP_MAX_COMPETITORS = 4;
export const GEO_RECAP_PROMPT_MAX_LENGTH = 80;

/** Quiet weeks only send the first recap of each month. */
export const GEO_RECAP_QUIET_MAX_DAY_OF_MONTH = 7;

/** Drop alert: last N days against the N-day baseline before them. */
export const GEO_ALERT_RECENT_DAYS = 2;
export const GEO_ALERT_BASELINE_DAYS = 7;
export const GEO_ALERT_MIN_DROP_POINTS = 15;
/** Recent answers needed before a drop is trusted. */
export const GEO_ALERT_MIN_RECENT_CHECKS = 20;
/** After an alert, the same owner hears about drops again a week later. */
export const GEO_ALERT_COOLDOWN_SECONDS = 7 * 24 * 60 * 60;
