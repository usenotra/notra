import type {
  OfferingCheckSample,
  OfferingFailureStatus,
  OfferingRateLimitScope,
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
  "Check if AI knows a feature by name, and whether it recommends it when a buyer only describes the problem. We ask GPT-6 with web search and show what it says and which pages it read. Free, no sign-up.";

export const OFFERING_CHECK_HERO_SUBTITLE =
  "Name a feature you shipped and the problem it solves. We ask GPT-6 about it by name and by problem, the way buyers do, and show what it finds and which pages it read. Free, no sign-up.";

export const OFFERING_CHECK_MODEL = "openai/gpt-6-luna";

/** The scan request carries the visitor's Turnstile token in this header. */
export const OFFERING_TURNSTILE_HEADER = "x-turnstile-token";

export const OFFERING_CHECK_GATEWAY_TAG = "offering-check";

export const OFFERING_CHECK_MODEL_LABEL = "GPT-6";

export const OFFERING_CHECK_KILL_SWITCH_ENV = "NOTRA_OFFERING_CHECK";

export const OFFERING_CHECK_FEATURE_MIN_LENGTH = 2;

export const OFFERING_CHECK_FEATURE_MAX_LENGTH = 80;

export const OFFERING_CHECK_PROBLEM_MIN_LENGTH = 12;

export const OFFERING_CHECK_PROBLEM_MAX_LENGTH = 200;

/** The remaining-characters hint shows once this few are left. */
export const OFFERING_CHECK_PROBLEM_COUNTER_FROM = 40;

export const OFFERING_CHECK_MAX_OTHER_OFFERINGS = 8;

export const OFFERING_CHECK_MAX_QUERIES = 6;

export const OFFERING_CHECK_MAX_SOURCE_DOMAINS = 8;

export const OFFERING_CHECK_MAX_SOURCE_PAGES = 25;

export const OFFERING_CHECK_MAX_OUTPUT_TOKENS = 1200;

export const OFFERING_CHECK_TIMEOUT_MS = 50_000;

/** Upper bound for one Upstash call; cache misses and rate-limit outages fall back after it. */
export const OFFERING_CHECK_REDIS_TIMEOUT = "1500 millis";

export const OFFERING_CHECK_DNS_TIMEOUT = "2 seconds";

export const OFFERING_CHECK_FEATURE_MAX_WORDS = 8;

export const OFFERING_CHECK_CACHE_SECONDS = 60 * 60 * 24;

export const OFFERING_CHECK_CACHE_PREFIX = "web:offering-check:v8";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * `scope` says whose quota ran out, so the visitor is only told "you used your
 * checks" when it really was their own limit.
 */
export const OFFERING_CHECK_RATE_LIMITS = {
  preflightPerIpMinute: { requests: 30, windowMs: 60 * 1000, scope: "visitor" },
  perIpHour: { requests: 5, windowMs: 60 * 60 * 1000, scope: "visitor" },
  perIpDay: { requests: 15, windowMs: DAY_MS, scope: "visitor" },
  perBrandDay: { requests: 25, windowMs: DAY_MS, scope: "site" },
  perBrandFeatureDay: { requests: 10, windowMs: DAY_MS, scope: "site" },
  globalDay: { requests: 1000, windowMs: DAY_MS, scope: "busy" },
} as const satisfies Record<
  string,
  { requests: number; windowMs: number; scope: OfferingRateLimitScope }
>;

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

export const OFFERING_CHECK_INVALID_REQUEST_MESSAGE =
  "Enter a website like acme.com. Feature name and problem are optional.";

export const OFFERING_CHECK_INVALID_MESSAGES = {
  "invalid-domain": "Enter a website like acme.com.",
  "invalid-feature":
    "Name the feature in a few words (2 to 80 characters, up to 8 words), or leave it empty.",
  "invalid-problem":
    "Describe the problem in one plain sentence, without links.",
} as const;

export const OFFERING_REPORT_FAILURE_MESSAGES: Record<
  OfferingFailureStatus,
  string
> = {
  "rate-limited": "You have used your free checks for now. Try again later.",
  "site-limited":
    "This website has been checked a lot today. Try again tomorrow.",
  busy: "The checker is busy right now. Try again later.",
  "unknown-site": "We could not find that website. Check the address.",
  unavailable: "The checker is paused right now. Try again later.",
  error: "Something went wrong while asking the model. Try again.",
};

export const OFFERING_CHECK_SAMPLES: readonly OfferingCheckSample[] = [
  {
    domain: "linear.app",
    feature: "Triage Intelligence",
    problem:
      "New bug reports pile up and nobody knows which team should pick them up.",
  },
  {
    domain: "vercel.com",
    feature: "Fluid compute",
    problem:
      "Our functions sit idle waiting on slow AI model responses and we still pay for that time.",
  },
  {
    domain: "resend.com",
    feature: "Broadcasts",
    problem: "We want to email a product update to all our users at once.",
  },
];

export const OFFERING_QUESTION_TITLES = {
  company: "Asked what you offer",
  name: "Asked by name",
  problem: "Asked by problem",
} as const;

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
    problemLabel: "Recommends it",
    badgeClassName:
      "bg-[#DFF5E8] text-[#1C6B3F] dark:bg-[#22C55E2E] dark:text-[#86EFAC]",
    textClassName: "text-[#1C6B3F] dark:text-[#86EFAC]",
    heroLead: "AI finds ",
    featureBody:
      "It finds the feature and can describe what it does from the pages available on the web.",
    companyBody:
      "It finds your product and can describe concrete products or features from the pages available on the web.",
    problemLead: "AI recommends ",
    problemBody:
      "Asked about the problem without the name, it points buyers straight to the feature.",
  },
  vague: {
    ...AMBER,
    label: "Vague",
    problemLabel: "Hints at it",
    heroLead: "AI is vague about ",
    featureBody:
      "It mentions the feature but cannot say what it does. Buyers asking about it get a hedged answer.",
    companyBody:
      "It knows you exist but stays generic about what you offer. Buyers asking about you get a hedged answer.",
    problemLead: "AI hints at ",
    problemBody:
      "Asked about the problem, it points in the right direction but never names the feature.",
  },
  confused: {
    ...AMBER,
    label: "Mixes it up",
    problemLabel: "Suggests something else",
    heroLead: "AI mixes up ",
    featureBody: CONFIDENTLY_WRONG_BODY,
    companyBody: CONFIDENTLY_WRONG_BODY,
    problemLead: "AI points away from ",
    problemBody:
      "Asked about the problem, it recommends something else. Buyers who describe the need end up elsewhere.",
  },
  unknown: {
    label: "Does not know it",
    problemLabel: "Never suggests it",
    badgeClassName:
      "bg-[#FCE4E4] text-[#9B1C1C] dark:bg-[#EF444433] dark:text-[#FCA5A5]",
    textClassName: "text-[#9B1C1C] dark:text-[#FCA5A5]",
    heroLead: "AI does not know ",
    featureBody:
      "Even with web search it could not find it. Anyone asking an assistant about it hears that it does not exist.",
    companyBody:
      "Even with web search it could not say what you offer. Anyone asking an assistant about you gets nothing.",
    problemLead: "AI never suggests ",
    problemBody:
      "Asked about the problem, it does not bring the feature up. Buyers who do not know the name will not find it.",
  },
};

export const OFFERING_YOU_TOOLTIP =
  "Your own website. These are the pages of yours the model opened.";

export const OFFERING_SEARCH_SKIPPED_HINT =
  "Web search was available, but the model answered without using it.";

export const OFFERING_CHECK_SIGNUP_SOURCE = "offering-check";

export const OFFERING_CHECK_FAVICON_SIZE = 64;

export const OFFERING_LINK_COPIED_MS = 1800;

export const OFFERING_SAMPLE_TYPING = {
  keyMs: 34,
  problemKeyMs: 9,
  jitterStepMs: 5,
  wordPauseMs: 35,
  fieldPauseMs: 160,
  eraseMs: 14,
  /** Old text is erased in this many steps per field, however long it is. */
  eraseSteps: 8,
} as const;

export const OFFERING_FAVICON_SETTLE_MS = 350;

export const OFFERING_FORM_URL_DEBOUNCE_MS = 400;

/** Size of the default globe Google returns for domains it has no icon for. */
export const OFFERING_FAVICON_FALLBACK_SIZE = 16;

export const OFFERING_FIELD_SHAKE = {
  keyframes: [
    { transform: "translateX(0)" },
    { transform: "translateX(-6px)" },
    { transform: "translateX(5px)" },
    { transform: "translateX(-3px)" },
    { transform: "translateX(2px)" },
    { transform: "translateX(0)" },
  ],
  timing: { duration: 380, easing: "ease-out" },
} satisfies { keyframes: Keyframe[]; timing: KeyframeAnimationOptions };
