import { Databuddy } from "@notra/ui/components/ui/svgs/databuddy";
import { GoogleAnalytics } from "@notra/ui/components/ui/svgs/googleAnalytics";
import { Plausible } from "@notra/ui/components/ui/svgs/plausible";
import { PostHog } from "@notra/ui/components/ui/svgs/posthog";

import type { SiteIntegrationProvider } from "@/types/site-integrations";

export const SITE_INTEGRATION_PROVIDERS: readonly SiteIntegrationProvider[] = [
  {
    id: "databuddy",
    name: "Databuddy",
    logo: Databuddy,
    docsUrl: "https://www.databuddy.cc/docs",
    fields: [{ key: "clientId", placeholder: "3ed1fce1-5a56-…" }],
  },
  {
    id: "plausible",
    name: "Plausible",
    logo: Plausible,
    docsUrl: "https://plausible.io/docs",
    fields: [{ key: "domain", placeholder: "acme.com" }],
  },
  {
    id: "posthog",
    name: "PostHog",
    logo: PostHog,
    docsUrl: "https://posthog.com/docs",
    fields: [
      { key: "apiKey", placeholder: "phc_…" },
      {
        key: "apiHost",

        placeholder: "https://us.i.posthog.com",
        optional: true,
      },
    ],
  },
  {
    id: "ga4",
    name: "Google Analytics",
    logo: GoogleAnalytics,
    docsUrl: "https://support.google.com/analytics/answer/9539598",
    fields: [{ key: "measurementId", placeholder: "G-XXXXXXXXXX" }],
  },
];
