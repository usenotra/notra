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
  { value: "scraping", label: "Scraping" },
  { value: "extracting", label: "Extracting" },
  { value: "saving", label: "Saving" },
];

export const TONE_OPTIONS: {
  value: ToneProfile;
  label: string;
  description: string;
}[] = [
  {
    value: "Conversational",
    label: "Conversational",
    description: "Warm and direct, like talking to a peer.",
  },
  {
    value: "Professional",
    label: "Professional",
    description: "Clear and confident without the fluff.",
  },
  {
    value: "Casual",
    label: "Casual",
    description: "Relaxed, friendly, reads like a chat.",
  },
  {
    value: "Formal",
    label: "Formal",
    description: "Precise and structured. No slang.",
  },
];

export const TONE_SELECT_ITEMS = Object.fromEntries(
  TONE_OPTIONS.map((option) => [option.value, option.label])
);

export const TONE_SCOPE_NOTE =
  "Tone only changes how things are phrased. Structure and facts stay the same. Pick Custom Tone to describe your own voice instead.";

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

export const BRAND_IDENTITY_NAV_ITEMS: readonly NavBrandIdentityItemConfig[] = [
  { tab: "identity", label: "Company Info", icon: CorporateIcon },
  { tab: "guidelines", label: "Brand Guidelines", icon: PaintBoardIcon },
  {
    tab: "references",
    label: "References",
    icon: Comment01Icon,
    countKey: "references",
  },
  { tab: "sitemap", label: "Sitemap", icon: GlobalIcon, countKey: "sitemap" },
];

export const BRAND_TAB_HEADERS: Record<
  BrandTab,
  { title: string; description: string }
> = {
  identity: {
    title: "Company Info",
    description: "Configure your brand identity and tone",
  },
  references: {
    title: "References",
    description: "Real posts that help the AI learn your writing style",
  },
  sitemap: {
    title: "Sitemap",
    description: "Track indexed pages and monitor site health for AI discovery",
  },
  guidelines: {
    title: "Brand Guidelines",
    description:
      "Logos, colors, typography, and landing page screenshots pulled from your site",
  },
};
