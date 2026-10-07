export const WEB_SESSION_TTL_SECONDS = 30 * 60;
export const WEB_SESSION_KEY_PREFIX = "web:session";
export const WEB_VISITOR_ID_LENGTH = 16;

export const WEB_DEFAULT_DAYS = 30;
export const WEB_PAGES_LIMIT = 50;
export const WEB_SOURCES_LIMIT = 25;
export const WEB_BREAKDOWN_LIMIT = 8;

export const WEB_MACHINE_PATH_PATTERN =
  /(?:\.md|\.txt|\.xml|\.json)$|^\/(?:robots\.txt|sitemap[^/]*|llms(?:-full)?\.txt|feed\.xml)$/i;

export const WEB_AI_PRODUCTS: Record<string, string> = {
  chatgpt: "openai",
  openai: "openai",
  claude: "anthropic",
  perplexity: "perplexity",
  gemini: "google",
  copilot: "microsoft",
  grok: "xai",
  deepseek: "deepseek",
  mistral: "mistral",
  you: "you",
  qwen: "alibaba",
  meta: "meta",
};

export const WEB_SEARCH_HOSTS: Record<string, string> = {
  "google.": "google",
  "bing.com": "bing",
  "duckduckgo.com": "duckduckgo",
  "search.yahoo.com": "yahoo",
  "yahoo.com": "yahoo",
  "ecosia.org": "ecosia",
  "search.brave.com": "brave",
  "kagi.com": "kagi",
  "yandex.": "yandex",
  "baidu.com": "baidu",
  "startpage.com": "startpage",
  "qwant.com": "qwant",
};

export const WEB_SOCIAL_HOSTS: Record<string, string> = {
  "t.co": "x",
  "x.com": "x",
  "twitter.com": "x",
  "linkedin.com": "linkedin",
  "lnkd.in": "linkedin",
  "facebook.com": "facebook",
  "fb.com": "facebook",
  "instagram.com": "instagram",
  "reddit.com": "reddit",
  "news.ycombinator.com": "hacker-news",
  "youtube.com": "youtube",
  "threads.net": "threads",
  "bsky.app": "bluesky",
  "mastodon.social": "mastodon",
  "github.com": "github",
  "producthunt.com": "product-hunt",
  "medium.com": "medium",
  "substack.com": "substack",
};

export const WEB_BROWSERS: readonly [string, string][] = [
  ["edg/", "Edge"],
  ["opr/", "Opera"],
  ["samsungbrowser/", "Samsung Internet"],
  ["firefox/", "Firefox"],
  ["fxios/", "Firefox"],
  ["crios/", "Chrome"],
  ["chrome/", "Chrome"],
  ["safari/", "Safari"],
];

export const WEB_OPERATING_SYSTEMS: readonly [string, string][] = [
  ["iphone", "iOS"],
  ["ipad", "iPadOS"],
  ["android", "Android"],
  ["windows", "Windows"],
  ["mac os x", "macOS"],
  ["cros", "ChromeOS"],
  ["linux", "Linux"],
];

export const ISO_DATE_LENGTH = 10;
