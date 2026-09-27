import {
  Comment01Icon,
  CorporateIcon,
  GlobalIcon,
  PaintBoardIcon,
} from "@hugeicons/core-free-icons";
import { SUPPORTED_LANGUAGES } from "@notra/ai/constants/languages";
import type { ToneProfile } from "@notra/ai/schemas/tone";

import type { BrandTab } from "@/types/brand-identity";
import type { NavBrandIdentityItemConfig } from "@/types/components/nav";

export const AUTO_SAVE_DELAY = 2500;

export const ANALYSIS_STEPS = [
  { value: "scraping" },
  { value: "extracting" },
  { value: "saving" },
];

export const TONE_OPTIONS: { value: ToneProfile }[] = [
  { value: "Conversational" },
  { value: "Professional" },
  { value: "Casual" },
  { value: "Formal" },
];

export const LANGUAGE_OPTIONS = SUPPORTED_LANGUAGES;

export { LANGUAGE_FLAGS } from "@/constants/language-flags";

export const FULL_URL_REGEX = /^https?:\/\//i;

export const IDENTITY_NAME_MAX_LENGTH = 13;

export const BRAND_IDENTITY_TAB_VALUES = [
  "identity",
  "references",
  "sitemap",
  "guidelines",
] as const satisfies readonly BrandTab[];

export const BRAND_IDENTITY_TAB_LABEL_KEYS = {
  identity: "companyInfo",
  references: "references",
  sitemap: "sitemap",
  guidelines: "brandGuidelines",
} as const satisfies Record<BrandTab, string>;

export const BRAND_IDENTITY_NAV_ITEMS: readonly NavBrandIdentityItemConfig[] = [
  { tab: "identity", icon: CorporateIcon },
  { tab: "guidelines", icon: PaintBoardIcon },
  {
    tab: "references",
    icon: Comment01Icon,
    countKey: "references",
  },
  { tab: "sitemap", icon: GlobalIcon, countKey: "sitemap" },
];
