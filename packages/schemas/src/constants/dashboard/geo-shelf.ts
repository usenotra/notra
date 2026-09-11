export const GEO_SHELF_SOURCE_KINDS = [
  "listicle",
  "review_site",
  "community",
  "news",
  "docs",
  "video",
  "other",
] as const;
export const GEO_SHELF_OWNERSHIPS = [
  "third_party",
  "own",
  "competitor",
] as const;
export const GEO_SHELF_ORIGINS = ["scan", "manual"] as const;
export const GEO_SHELF_FETCH_STATUSES = [
  "pending",
  "ok",
  "blocked",
  "failed",
] as const;
export const GEO_SHELF_PLACEMENT_STATUSES = [
  "present",
  "absent",
  "unknown",
] as const;
export const GEO_SHELF_PLACEMENT_EVIDENCES = ["fetch", "manual"] as const;
export const GEO_SHELF_OPPORTUNITY_STATUSES = [
  "open",
  "in_progress",
  "won",
  "lost",
  "dismissed",
] as const;
export const GEO_SHELF_PRIORITIES = ["low", "medium", "high"] as const;
export const GEO_SHELF_NOTES_MAX_LENGTH = 2000;
export const GEO_SHELF_TITLE_MAX_LENGTH = 200;
export const GEO_SHELF_URL_MAX_LENGTH = 2048;
// Shelf sources are public web pages: only http(s) URLs on a real, publicly
// resolvable hostname are accepted.
export const GEO_SHELF_URL_PROTOCOL_PATTERN = /^https?$/;
export const GEO_SHELF_URL_INVALID_MESSAGE =
  "Enter a public http or https page URL";
/** Hosts that should collapse onto one canonical shelf domain. */
export const GEO_SHELF_HOSTNAME_ALIASES: Record<string, string> = {
  "old.reddit.com": "reddit.com",
  "new.reddit.com": "reddit.com",
  "m.reddit.com": "reddit.com",
  "np.reddit.com": "reddit.com",
  "amp.reddit.com": "reddit.com",
  "i.reddit.com": "reddit.com",
};
export const GEO_SHELF_BLOCKED_HOSTNAMES: readonly string[] = [
  "localhost",
  "localhost.localdomain",
  "broadcasthost",
  "metadata.google.internal",
];
export const GEO_SHELF_BLOCKED_HOSTNAME_SUFFIXES: readonly string[] = [
  ".local",
  ".localhost",
  ".localdomain",
  ".internal",
  ".intranet",
  ".lan",
  ".home",
  ".home.arpa",
  ".corp",
  ".test",
  ".example",
  ".invalid",
  ".onion",
];
export const GEO_SHELF_MIN_HOSTNAME_LABELS = 2;
export const GEO_SHELF_MIN_HOSTNAME_TLD_LENGTH = 2;
export const GEO_SHELF_TRACKING_PARAMS: readonly string[] = [
  "ref",
  "ref_src",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
];
export const GEO_SHELF_TRACKING_PARAM_PREFIXES: readonly string[] = ["utm_"];
