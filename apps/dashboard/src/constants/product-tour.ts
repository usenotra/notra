import {
  GEO_GAPS_NAV_LINK,
  GEO_PROMPTS_NAV_LINK,
  GEO_WRITER_NAV_LINK,
} from "@notra/geo-core/constants/geo";

import {
  GEO_COMPETITORS_NAV_LINK,
  GEO_OVERVIEW_NAV_LINK,
} from "@/constants/nav";

export const PRODUCT_TOUR_STEPS = [
  {
    id: "geo-overview",
    link: GEO_OVERVIEW_NAV_LINK,
    title: "Your first scan is already running",
    body: "Setup started a scan of how AI engines talk about you. Follow it from here. Answers show up on this page as they come in.",
  },
  {
    id: "geo-scan",
    link: GEO_PROMPTS_NAV_LINK,
    title: "Watch the scan while it works",
    body: "Each prompt is a question we ask the engines. This is the live run, so you can see progress instead of a blank dashboard.",
  },
  {
    id: "geo-gaps",
    link: GEO_GAPS_NAV_LINK,
    title: "These are your content gaps",
    body: "Questions engines answer without mentioning you. This list is what to write next.",
  },
  {
    id: "geo-competitors",
    link: GEO_COMPETITORS_NAV_LINK,
    title: "See who gets named instead",
    body: "Competitors are the brands engines recommend in your place. The scan fills this in as answers land.",
  },
  {
    id: "geo-write",
    link: GEO_WRITER_NAV_LINK,
    title: "Turn a gap into a draft",
    body: "Write starts from a topic the engines already answer. Approve the brief and the draft opens in Content.",
  },
] as const;

export const PRODUCT_TOUR_CARD_WIDTH = 420;
export const PRODUCT_TOUR_CARD_HEIGHT = 168;
export const PRODUCT_TOUR_VIEWPORT_MARGIN = 16;
export const PRODUCT_TOUR_TARGET_GAP = 12;
