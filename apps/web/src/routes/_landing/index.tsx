import { createFileRoute } from "@tanstack/react-router";

import { LandingPage } from "@/components/landing/landing-page";
import { LANDING_PAGE_METADATA } from "@/constants/landing/metadata";
import { buildHead } from "@/utils/head";

export const Route = createFileRoute("/_landing/")({
  head: () => buildHead(LANDING_PAGE_METADATA),
  component: LandingPage,
});
