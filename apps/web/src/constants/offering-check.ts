import type {
  OfferingCheckMode,
  OfferingCheckSample,
  OfferingOverall,
  OfferingOverallCopy,
  OfferingVerdict,
  OfferingReportStatus,
  OfferingVerdictCopy,
} from "@/types/offering-check";
import { SITE_URL } from "@/utils/urls";

const OFFERING_CHECK_PATH = "/offering";

export const OFFERING_CHECK_URL = `${SITE_URL}${OFFERING_CHECK_PATH}`;

export const OFFERING_REPORT_PATH = `${OFFERING_CHECK_PATH}/report`;

export const OFFERING_CHECK_FORM_PATH = OFFERING_CHECK_PATH;

export const OFFERING_CHECK_API_PATH = "/api/offering-check";

export const OFFERING_CHECK_PREFLIGHT_PATH = `${OFFERING_CHECK_API_PATH}/preflight`;

export const OFFERING_CHECK_TITLE = "Does AI Know Your Features?";

export const OFFERING_CHECK_DESCRIPTION =
  "Enter your website, and a feature name if you want to check one. We ask GPT-5.6 about it twice, once from memory and once with web search, and show what it says, which pages it read and what it thinks you offer instead. Free, no sign-up.";

export const OFFERING_CHECK_HERO_SUBTITLE =
  "Enter your website, or name a feature you shipped. We ask GPT-5.6 about it from memory and with web search, then show what it knows, which pages it read and what it thinks you offer instead. Free, no sign-up.";

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

export const OFFERING_CHECK_ANSWER_MAX_OUTPUT_TOKENS = 1200;

export const OFFERING_CHECK_JUDGE_MAX_OUTPUT_TOKENS = 1000;

export const OFFERING_CHECK_TIMEOUT_MS = 50_000;

export const OFFERING_CHECK_CACHE_SECONDS = 60 * 60 * 24;

export const OFFERING_CHECK_CACHE_PREFIX = "web:offering-check:v5";

export const OFFERING_CHECK_RATE_LIMITS = {
  perIpHour: { requests: 5, window: "1h" },
  perIpDay: { requests: 15, window: "1d" },
  perBrandDay: { requests: 25, window: "1d" },
  perBrandFeatureDay: { requests: 2, window: "1d" },
  globalDay: { requests: 1000, window: "1d" },
} as const;

export const OFFERING_CHECK_QUERY_KEYS = {
  domain: "domain",
  feature: "feature",
  description: "description",
} as const;

export const OFFERING_CHECK_INVALID_MESSAGE =
  "Enter a website like acme.com. Feature name and description are optional.";

export const OFFERING_REPORT_FAILURE_MESSAGES: Record<
  Exclude<OfferingReportStatus, "checking" | "done">,
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

export const OFFERING_MODE_TITLES: Record<OfferingCheckMode, string> = {
  memory: "From memory",
  search: "With web search",
};

export const OFFERING_VERDICT_COPY: Record<
  OfferingVerdict,
  OfferingVerdictCopy
> = {
  knows: {
    label: "Knows it",
    className:
      "bg-[#DFF5E8] text-[#1C6B3F] dark:bg-[#22C55E2E] dark:text-[#86EFAC]",
  },
  vague: {
    label: "Vague",
    className:
      "bg-[#FDF1DC] text-[#8A5A00] dark:bg-[#F5A62333] dark:text-[#F5C76A]",
  },
  confused: {
    label: "Mixes it up",
    className:
      "bg-[#FDF1DC] text-[#8A5A00] dark:bg-[#F5A62333] dark:text-[#F5C76A]",
  },
  unknown: {
    label: "Does not know it",
    className:
      "bg-[#FCE4E4] text-[#9B1C1C] dark:bg-[#EF444433] dark:text-[#FCA5A5]",
  },
};

export const OFFERING_OVERALL_COPY: Record<
  OfferingOverall,
  OfferingOverallCopy
> = {
  known: {
    lead: "AI knows ",
    trail: "",
    body: "It can describe the feature without looking anything up, so it comes up even when the assistant does not search.",
  },
  "search-only": {
    lead: "AI only finds ",
    trail: " by searching",
    body: "The model did not learn this feature in training. It gets it right once it searches, so answers depend on your pages ranking for the question.",
  },
  vague: {
    lead: "AI is vague about ",
    trail: "",
    body: "It mentions the feature but cannot say what it does. Buyers asking about it get a hedged answer.",
  },
  confused: {
    lead: "AI mixes up ",
    trail: "",
    body: "It describes something different from what you ship. That is worse than silence, because it sounds confident.",
  },
  unknown: {
    lead: "AI does not know ",
    trail: "",
    body: "Even with web search it could not find it. Anyone asking an assistant about it hears that it does not exist.",
  },
};

export const OFFERING_COMPANY_OVERALL_BODY: Record<OfferingOverall, string> = {
  known:
    "It can say what you offer without looking anything up, so you come up even when the assistant does not search.",
  "search-only":
    "The model did not learn your product in training. It gets it right once it searches, so answers depend on your pages ranking for the question.",
  vague:
    "It knows you exist but stays generic about what you offer. Buyers asking about you get a hedged answer.",
  confused:
    "It describes something different from what you ship. That is worse than silence, because it sounds confident.",
  unknown:
    "Even with web search it could not say what you offer. Anyone asking an assistant about you gets nothing.",
};

export const OFFERING_YOU_TOOLTIP =
  "Your own website. These are the pages of yours the model opened.";

export const OFFERING_SEARCH_SKIPPED_HINT =
  "Web search was available, but the model answered without using it.";

export const OFFERING_CHECK_SIGNUP_SOURCE = "offering-check";

export const OFFERING_CHECK_FAVICON_SIZE = 64;
