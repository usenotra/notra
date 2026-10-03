import type {
  OfferingCheckSample,
  OfferingFailureStatus,
  OfferingVerdict,
  OfferingVerdictCopy,
} from "@/types/offering-check";
import { SITE_URL } from "@/utils/urls";

export const OFFERING_CHECK_PATH = "/offering";

export const OFFERING_REPORT_PATH = "/offering/report";

export const OFFERING_CHECK_URL = `${SITE_URL}${OFFERING_CHECK_PATH}`;

export const OFFERING_CHECK_API_PATH = "/api/offering-check";

export const OFFERING_CHECK_PREFLIGHT_PATH = `${OFFERING_CHECK_API_PATH}/preflight`;

export const OFFERING_CHECK_TITLE = "Does AI Know Your Features?";

export const OFFERING_CHECK_DESCRIPTION =
  "Enter your website, and a feature name if you want to check one. We ask GPT-5.6 about it with web search and show what it says, which pages it read and what it thinks you offer instead. Free, no sign-up.";

export const OFFERING_CHECK_HERO_SUBTITLE =
  "Enter your website, or name a feature you shipped. We ask GPT-5.6 about it with web search, then show what it finds, which pages it read and what it thinks you offer instead. Free, no sign-up.";

export const OFFERING_CHECK_MODEL = "openai/gpt-5.6-luna";

export const OFFERING_CHECK_MODEL_LABEL = "GPT-5.6";

export const OFFERING_CHECK_KILL_SWITCH_ENV = "NOTRA_OFFERING_CHECK";

export const OFFERING_CHECK_FEATURE_MIN_LENGTH = 2;

export const OFFERING_CHECK_FEATURE_MAX_LENGTH = 80;

export const OFFERING_CHECK_DESCRIPTION_MAX_LENGTH = 280;

export const OFFERING_CHECK_MAX_OTHER_OFFERINGS = 8;

export const OFFERING_CHECK_MAX_QUERIES = 6;

export const OFFERING_CHECK_MAX_SOURCE_DOMAINS = 8;

export const OFFERING_CHECK_MAX_SOURCE_PAGES = 25;

export const OFFERING_CHECK_MAX_OUTPUT_TOKENS = 1800;

export const OFFERING_CHECK_TIMEOUT_MS = 50_000;

export const OFFERING_CHECK_CACHE_SECONDS = 60 * 60 * 24;

export const OFFERING_CHECK_CACHE_PREFIX = "web:offering-check:v6";

export const OFFERING_CHECK_RATE_LIMITS = {
  preflightPerIpMinute: { requests: 30, windowMs: 60 * 1000 },
  perIpHour: { requests: 5, windowMs: 60 * 60 * 1000 },
  perIpDay: { requests: 15, windowMs: 24 * 60 * 60 * 1000 },
  perBrandDay: { requests: 25, windowMs: 24 * 60 * 60 * 1000 },
  perBrandFeatureDay: { requests: 2, windowMs: 24 * 60 * 60 * 1000 },
  globalDay: { requests: 1000, windowMs: 24 * 60 * 60 * 1000 },
} as const;

export const OFFERING_CHECK_RATE_LIMIT_SCRIPT = `
local now = tonumber(ARGV[1])
local consume = ARGV[2] == "1"

for keyIndex = 1, #KEYS, 2 do
  local limitIndex = (keyIndex + 1) / 2
  local limit = tonumber(ARGV[limitIndex * 2 + 1])
  local window = tonumber(ARGV[limitIndex * 2 + 2])
  local current = tonumber(redis.call("GET", KEYS[keyIndex]) or "0")
  local previous = tonumber(redis.call("GET", KEYS[keyIndex + 1]) or "0")
  local weightedPrevious = math.floor((1 - (now % window) / window) * previous)

  if current + weightedPrevious >= limit then
    return {0, limitIndex}
  end
end

if consume then
  for keyIndex = 1, #KEYS, 2 do
    local limitIndex = (keyIndex + 1) / 2
    local window = tonumber(ARGV[limitIndex * 2 + 2])
    local current = redis.call("INCR", KEYS[keyIndex])
    if current == 1 then
      redis.call("PEXPIRE", KEYS[keyIndex], window * 2 + 1000)
    end
  end
end

return {1, 0}
`;

export const OFFERING_CHECK_INVALID_MESSAGE =
  "Enter a website like acme.com. Feature name and description are optional.";

export const OFFERING_REPORT_FAILURE_MESSAGES: Record<
  OfferingFailureStatus,
  string
> = {
  "rate-limited": "You have used your free checks for now. Try again later.",
  unavailable: "The checker is paused right now. Try again later.",
  error: "Something went wrong while asking the model. Try again.",
};

export const OFFERING_CHECK_SAMPLES: readonly OfferingCheckSample[] = [
  { domain: "linear.app", feature: "Triage Intelligence", description: "" },
  { domain: "vercel.com", feature: "Fluid compute", description: "" },
  { domain: "resend.com", feature: "Broadcasts", description: "" },
];

export const OFFERING_MODE_TITLE = "With web search";

const AMBER = {
  badgeClassName:
    "bg-[#FDF1DC] text-[#8A5A00] dark:bg-[#F5A62333] dark:text-[#F5C76A]",
  textClassName: "text-[#8A5A00] dark:text-[#F5C76A]",
};

const CONFIDENTLY_WRONG_BODY =
  "It describes something different from what you ship. That is worse than silence, because it sounds confident.";

export const OFFERING_VERDICTS: Record<OfferingVerdict, OfferingVerdictCopy> = {
  knows: {
    label: "Knows it",
    badgeClassName:
      "bg-[#DFF5E8] text-[#1C6B3F] dark:bg-[#22C55E2E] dark:text-[#86EFAC]",
    textClassName: "text-[#1C6B3F] dark:text-[#86EFAC]",
    heroLead: "AI finds ",
    featureBody:
      "It finds the feature and can describe what it does from the pages available on the web.",
    companyBody:
      "It finds your product and can describe concrete products or features from the pages available on the web.",
  },
  vague: {
    ...AMBER,
    label: "Vague",
    heroLead: "AI is vague about ",
    featureBody:
      "It mentions the feature but cannot say what it does. Buyers asking about it get a hedged answer.",
    companyBody:
      "It knows you exist but stays generic about what you offer. Buyers asking about you get a hedged answer.",
  },
  confused: {
    ...AMBER,
    label: "Mixes it up",
    heroLead: "AI mixes up ",
    featureBody: CONFIDENTLY_WRONG_BODY,
    companyBody: CONFIDENTLY_WRONG_BODY,
  },
  unknown: {
    label: "Does not know it",
    badgeClassName:
      "bg-[#FCE4E4] text-[#9B1C1C] dark:bg-[#EF444433] dark:text-[#FCA5A5]",
    textClassName: "text-[#9B1C1C] dark:text-[#FCA5A5]",
    heroLead: "AI does not know ",
    featureBody:
      "Even with web search it could not find it. Anyone asking an assistant about it hears that it does not exist.",
    companyBody:
      "Even with web search it could not say what you offer. Anyone asking an assistant about you gets nothing.",
  },
};

export const OFFERING_YOU_TOOLTIP =
  "Your own website. These are the pages of yours the model opened.";

export const OFFERING_SEARCH_SKIPPED_HINT =
  "Web search was available, but the model answered without using it.";

export const OFFERING_CHECK_SIGNUP_SOURCE = "offering-check";

export const OFFERING_CHECK_FAVICON_SIZE = 64;

export const OFFERING_LINK_COPIED_MS = 1800;

export const OFFERING_SAMPLE_TYPE_MS = 28;

export const OFFERING_FAVICON_SETTLE_MS = 350;
