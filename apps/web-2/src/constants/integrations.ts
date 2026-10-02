import type { Integration } from "@/types/integrations";
import { DOCS_URL } from "@/utils/urls";

export const INTEGRATIONS_CONSOLE_URL = "https://console.usenotra.com";

export const INTEGRATIONS_DOCS_URL = DOCS_URL;

export const FEATURED_INTEGRATIONS_LIMIT = 2;

export const QUICK_VIEW_VISIBLE_TOOLS = 5;

export const DETAIL_VISIBLE_TOOLS = 5;

export const ALL_CATEGORY_ID = "all";

export const INTEGRATION_REFERRAL_SOURCE = "usenotra.com";

const R2_ASSET_PREFIX = "https://pub-006cb776ab3047f59b502d72fca0f223.r2.dev";

const FALLBACK_INTEGRATION_ID = "brew-store-listing";

export const FALLBACK_INTEGRATIONS: Integration[] = [
  {
    id: FALLBACK_INTEGRATION_ID,
    name: "Brew",
    description: "Manage brew stuff",
    author: "Brew, Inc.",
    websiteUrl: "https://brew.new",
    brandColor: "#FF772D",
    logoLightUrl: `${R2_ASSET_PREFIX}/organization/Z2zWjF9rtxltZopse25PQlGLyjIMspkP/integration-branding/logo-light-5cf3f874-1c50-4cd7-8683-168309190b1f.svg`,
    logoDarkUrl: `${R2_ASSET_PREFIX}/organization/Z2zWjF9rtxltZopse25PQlGLyjIMspkP/integration-branding/logo-dark-6f8c0ac4-8a8b-499d-9114-b0ddcf876728.svg`,
    bannerUrl: `${R2_ASSET_PREFIX}/organization/Z2zWjF9rtxltZopse25PQlGLyjIMspkP/integration-branding/banner-8e004074-d488-49f8-827d-9a1492faaaad.png`,
    slug: "brew",
    category: "Marketing",
    featuredAt: "2026-01-01T00:00:00.000Z",
    authType: "oauth",
    indexedToolCount: 67,
    tools: [],
  },
];
