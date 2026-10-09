import {
  ChartHistogramIcon,
  CloudServerIcon,
  Database02Icon,
  Mail01Icon,
  Megaphone01Icon,
  ShieldKeyIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

import {
  STATE_OF_AI_SEARCH_PATH,
  STATE_OF_AI_SEARCH_TITLE,
} from "@/constants/state-of-ai-search";
import { listLatestSummaries } from "@/lib/state-of-ai-search/reports";
import type { MarketingNavGroup } from "@/utils/navigation";

const REPORT_CATEGORY_ICONS: Record<string, IconSvgElement> = {
  "ai-visibility": ViewIcon,
  "app-hosting": CloudServerIcon,
  auth: ShieldKeyIcon,
  changelog: Megaphone01Icon,
  "email-api": Mail01Icon,
  postgres: Database02Icon,
};

const REPORT_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "ai-visibility": "See which GEO tools AI recommends",
  "app-hosting": "How hosting platforms rank in AI search",
  auth: "Auth providers recommended by AI",
  changelog: "Release note tools recommended by AI",
  "email-api": "Email providers ranked in AI search",
  postgres: "The Postgres providers AI recommends",
};

export const REPORTS_NAV: MarketingNavGroup = {
  type: "group",
  layout: "compact",
  label: "Reports",
  cardsHeading: STATE_OF_AI_SEARCH_TITLE,
  cards: [],
  railHeading: "Categories",
  rail: listLatestSummaries().map((report) => ({
    href: `${STATE_OF_AI_SEARCH_PATH}/${report.slug}`,
    label: report.subject,
    description:
      REPORT_CATEGORY_DESCRIPTIONS[report.slug] ?? "Monthly AI search rankings",
    icon: REPORT_CATEGORY_ICONS[report.slug] ?? ChartHistogramIcon,
  })),
};
