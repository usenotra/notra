import {
  GEO_SHELF_FETCH_STATUSES,
  GEO_SHELF_OPPORTUNITY_STATUSES,
  GEO_SHELF_OWNERSHIPS,
  GEO_SHELF_PLACEMENT_STATUSES,
  GEO_SHELF_PRIORITIES,
  GEO_SHELF_SOURCE_KINDS,
  GEO_SHELF_TITLE_MAX_LENGTH,
  GEO_SHELF_URL_MAX_LENGTH,
} from "@notra/schemas/constants/dashboard/geo-shelf";

export const GEO_SHELF_SHELF_FILTERS = [
  "all",
  "opportunities",
  "on_shelf",
  "unknown",
] as const;

export const GEO_SHELF_TICKET_FILTERS = [
  "any",
  "open",
  "in_progress",
  "mine",
  "unassigned",
  "closed",
] as const;

export const GEO_SHELF_VIEWS = ["table", "board"] as const;

export const GEO_SHELF_VIEW_LABELS: Record<
  (typeof GEO_SHELF_VIEWS)[number],
  string
> = {
  table: "Table",
  board: "Board",
};

export const GEO_SHELF_SOURCE_KIND_LABELS: Record<
  (typeof GEO_SHELF_SOURCE_KINDS)[number],
  string
> = {
  listicle: "Listicle",
  review_site: "Review site",
  community: "Community",
  news: "News",
  docs: "Docs",
  video: "Video",
  other: "Other",
};

export const GEO_SHELF_OWNERSHIP_LABELS: Record<
  (typeof GEO_SHELF_OWNERSHIPS)[number],
  string
> = {
  third_party: "Third party",
  own: "Your site",
  competitor: "Competitor site",
};

export const GEO_SHELF_PLACEMENT_LABELS: Record<
  (typeof GEO_SHELF_PLACEMENT_STATUSES)[number],
  string
> = {
  present: "On shelf",
  absent: "Missing",
  unknown: "Not checked",
};

export const GEO_SHELF_PLACEMENT_HINTS: Record<
  (typeof GEO_SHELF_PLACEMENT_STATUSES)[number],
  string
> = {
  present: "This brand is listed on the page",
  absent: "This brand is not listed on the page",
  unknown:
    "We haven't checked if this brand is listed on the page. Open the row to mark it.",
};

export const GEO_SHELF_COMPETITORS_UNCHECKED_HINT =
  "We haven't checked if competitors are listed on this page. Open the row to mark them.";
export const GEO_SHELF_COMPETITORS_NONE_HINT =
  "None of your tracked competitors are marked as listed on this page.";

export const GEO_SHELF_OPPORTUNITY_STATUS_LABELS: Record<
  (typeof GEO_SHELF_OPPORTUNITY_STATUSES)[number],
  string
> = {
  open: "Open",
  in_progress: "In progress",
  won: "Won",
  lost: "Lost",
  dismissed: "Dismissed",
};

export const GEO_SHELF_PRIORITY_LABELS: Record<
  (typeof GEO_SHELF_PRIORITIES)[number],
  string
> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const GEO_SHELF_FETCH_STATUS_LABELS: Record<
  (typeof GEO_SHELF_FETCH_STATUSES)[number],
  string
> = {
  pending: "Not checked yet",
  ok: "Verified",
  blocked: "Page blocked our fetch",
  failed: "Fetch failed",
};

export const GEO_SHELF_SHELF_FILTER_OPTIONS: {
  value: (typeof GEO_SHELF_SHELF_FILTERS)[number];
  label: string;
  description: string;
}[] = [
  {
    value: "all",
    label: "All shelves",
    description: "Every page engines cite for your prompts",
  },
  {
    value: "opportunities",
    label: "Opportunities",
    description: "Competitors are on the page and you are not",
  },
  {
    value: "on_shelf",
    label: "You're on it",
    description: "Pages where your brand is already present",
  },
  {
    value: "unknown",
    label: "Not checked",
    description: "We haven't checked yet if you're listed on the page",
  },
];

export const GEO_SHELF_TICKET_FILTER_OPTIONS: {
  value: (typeof GEO_SHELF_TICKET_FILTERS)[number];
  label: string;
}[] = [
  { value: "any", label: "Any ticket state" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "mine", label: "Assigned to me" },
  { value: "unassigned", label: "Unassigned" },
  { value: "closed", label: "Closed" },
];

export const GEO_SHELF_OPEN_STATUSES: readonly (typeof GEO_SHELF_OPPORTUNITY_STATUSES)[number][] =
  ["open", "in_progress"];

export const GEO_SHELF_BOARD_COLUMNS = [
  { id: "untracked", name: "No ticket" },
  ...GEO_SHELF_OPPORTUNITY_STATUSES.map((status) => ({
    id: status,
    name: GEO_SHELF_OPPORTUNITY_STATUS_LABELS[status],
  })),
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
/** `title` flexes; other columns size to their header/content so the row fits. */
export const GEO_SHELF_TABLE_COLUMN = {
  title: { width: "1fr", minWidth: "10rem" },
  citations: { width: "8rem" },
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

export const GEO_SHELF_URL_TOO_LONG_MESSAGE = `Page URL must be ${GEO_SHELF_URL_MAX_LENGTH.toLocaleString()} characters or fewer`;
export const GEO_SHELF_TITLE_TOO_LONG_MESSAGE = `Title must be ${GEO_SHELF_TITLE_MAX_LENGTH} characters or fewer`;
export const GEO_SHELF_DUPLICATE_URL_MESSAGE =
  "This page is already on your shelf";
export const GEO_SHELF_PREVIEW_RATE_LIMIT_MESSAGE =
  "Too many page lookups. Please wait a minute.";
export const GEO_SHELF_PREVIEW_RATE_LIMIT_SCOPE = "shelf-preview";
export const GEO_SHELF_PREVIEW_UNAVAILABLE_MESSAGE =
  "Couldn't read the page title, you can type it";

export const GEO_SHELF_ADD_LABEL = "Add shelf";
export const GEO_SHELF_NO_MATCHES_MESSAGE = "No shelves match these filters";
export const GEO_SHELF_EMPTY_TITLE = "No shelf space tracked yet";
export const GEO_SHELF_EMPTY_SCANNED_DESCRIPTION =
  "No third-party page has been cited for your prompts yet. Add a page you want to be listed on, or wait for the next scan.";
export const GEO_SHELF_EMPTY_UNSCANNED_DESCRIPTION =
  "Shelves appear once a scan cites third-party pages for your prompts. You can also add a page you want to be listed on.";

export const GEO_SHELF_PREVIEW_OUTCOMES = {
  RATE_LIMITED: "rate_limited",
  FETCHED: "fetched",
  UNAVAILABLE: "unavailable",
} as const;
