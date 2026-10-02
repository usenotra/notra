import { createFileRoute } from "@tanstack/react-router";

import {
  LANDING_PAGE_METADATA,
  LandingPage,
} from "@/components/landing/landing-page";
import { buildHead } from "@/utils/head";

export const Route = createFileRoute("/_landing/")({
  head: () => buildHead(LANDING_PAGE_METADATA),
  component: LandingPage,
});
