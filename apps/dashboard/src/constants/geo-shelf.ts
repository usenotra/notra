import {
  GEO_SHELF_OPPORTUNITY_STATUSES,
  GEO_SHELF_SOURCE_KINDS,
  GEO_SHELF_TICKET_FILTERS,
} from "@notra/schemas/constants/dashboard/geo-shelf";

/** The table is virtualized, so a page only bounds the payload per request. */
export const GEO_SHELF_PAGE_SIZE = 100;
export const GEO_SHELF_SEARCH_DEBOUNCE_MS = 250;
export const GEO_SHELF_DEFAULT_SORT = {
  key: "citations",
  direction: "desc",
} as const;
export const GEO_SHELF_EMPTY_BOARD_COUNTS = {
  untracked: 0,
  open: 0,
  in_progress: 0,
  won: 0,
  lost: 0,
  dismissed: 0,
} as const;

export const GEO_SHELF_VIEWS = ["table", "board"] as const;

export const GEO_SHELF_OPEN_STATUSES: readonly (typeof GEO_SHELF_OPPORTUNITY_STATUSES)[number][] =
  ["open", "in_progress"];

export const GEO_SHELF_BOARD_COLUMNS = [
  { id: "untracked" },
  ...GEO_SHELF_OPPORTUNITY_STATUSES.map((status) => ({ id: status })),
];

export const GEO_SHELF_BOARD_COLUMN_IDS_BY_TICKET_FILTER = {
  any: ["untracked", "open", "in_progress", "won", "lost", "dismissed"],
  open: ["open"],
  in_progress: ["in_progress"],
  mine: ["open", "in_progress"],
  unassigned: ["open", "in_progress"],
  closed: ["won", "lost", "dismissed"],
} as const satisfies Record<
  (typeof GEO_SHELF_TICKET_FILTERS)[number],
  readonly (typeof GEO_SHELF_BOARD_COLUMNS)[number]["id"][]
>;

export const GEO_SHELF_BOARD_HEIGHT = 640;
export const GEO_SHELF_BOARD_COLUMN_WIDTH = 304;
export const GEO_SHELF_BOARD_COLUMN_HEADER_HEIGHT = 44;
export const GEO_SHELF_BOARD_CARD_HEIGHT = 128;
export const GEO_SHELF_BOARD_OVERSCAN = 6;
export const GEO_SHELF_BOARD_COLUMN_SCROLL_HEIGHT =
  GEO_SHELF_BOARD_HEIGHT - GEO_SHELF_BOARD_COLUMN_HEADER_HEIGHT;

export const GEO_SHELF_TABLE_ROW_HEIGHT = 56;
export const GEO_SHELF_TABLE_HEIGHT = 560;
export const GEO_SHELF_MIN_VIEWPORT_RATIO = 0.6;
/** `title` flexes; other columns size to their header/content so the row fits. */
export const GEO_SHELF_TABLE_COLUMN = {
  title: { width: "1fr", minWidth: "10rem" },
  citations: { width: "10rem" },
  own: { width: "9rem" },
  competitors: { width: "7.5rem" },
  ticket: { width: "7rem" },
} as const;
export const GEO_SHELF_HOVER_DELAY_MS = 150;
export const GEO_SHELF_ENGINE_STACK_LIMIT = 3;
export const GEO_SHELF_COMPETITOR_STACK_LIMIT = 4;
export const GEO_SHELF_NOTES_SAVE_DEBOUNCE_MS = 300;
export const GEO_SHELF_CITATION_WINDOW_DAYS = 30;
export const GEO_SHELF_CITATION_INSERT_CHUNK = 100;
export const GEO_SHELF_EMPTY_CITATIONS = {
  windowCount: 0,
  totalCount: 0,
  promptCount: 0,
  engines: [] as string[],
  firstCitedAt: null,
  lastCitedAt: null,
};

export const GEO_SHELF_KIND_BY_DOMAIN: Record<
  string,
  (typeof GEO_SHELF_SOURCE_KINDS)[number]
> = {
  "reddit.com": "community",
  "news.ycombinator.com": "community",
  "quora.com": "community",
  "stackoverflow.com": "community",
  "stackexchange.com": "community",
  "producthunt.com": "community",
  "indiehackers.com": "community",
  "youtube.com": "video",
  "youtu.be": "video",
  "vimeo.com": "video",
  "g2.com": "review_site",
  "capterra.com": "review_site",
  "trustradius.com": "review_site",
  "gartner.com": "review_site",
  "trustpilot.com": "review_site",
  "techcrunch.com": "news",
  "theverge.com": "news",
  "wired.com": "news",
};

export const GEO_SHELF_DOCS_HOSTNAME_PREFIX = "docs.";
export const GEO_SHELF_ADD_HOTKEY = "A";
export const GEO_SHELF_POC_SAME_AS_ASSIGNEE = "__assignee__";
export const GEO_SHELF_UNASSIGNED = "__unassigned__";
export const GEO_SHELF_NO_PRIORITY = "__none__";
export const GEO_SHELF_PREVIEW_DEBOUNCE_MS = 600;
export const GEO_SHELF_PREVIEW_STALE_MS = 10 * 60 * 1000;
export const GEO_SHELF_PREVIEW_TIMEOUT_MS = 30_000;
export const GEO_SHELF_PREVIEW_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

/** Non-public IPv4 space from the IANA special-purpose registries. */
export const GEO_SHELF_BLOCKED_IPV4_SUBNETS: readonly (readonly [
  string,
  number,
])[] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.31.196.0", 24],
  ["192.52.193.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["192.175.48.0", 24],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

/** Non-public IPv6 space from the IANA special-purpose registries. */
export const GEO_SHELF_BLOCKED_IPV6_SUBNETS: readonly (readonly [
  string,
  number,
])[] = [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
  ["5f00::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
];

export const GEO_SHELF_PREVIEW_RATE_LIMIT_CODE = "shelf_preview_rate_limited";
export const GEO_SHELF_PREVIEW_RATE_LIMIT_SCOPE = "shelf-preview";
export const GEO_SHELF_PREVIEW_OUTCOMES = {
  RATE_LIMITED: "rate_limited",
  FETCHED: "fetched",
  UNAVAILABLE: "unavailable",
} as const;
