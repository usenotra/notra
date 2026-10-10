import {
  OFFERING_CHECK_DESCRIPTION,
  OFFERING_CHECK_TITLE,
  OFFERING_CHECK_URL,
} from "@/constants/offering-check";
import type { Metadata } from "@/types/metadata";
import { buildBreadcrumbJsonLd } from "@/utils/jsonld";
import { DEFAULT_SOCIAL_IMAGE, TWITTER_HANDLE } from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

export const OFFERING_CHECK_METADATA: Metadata = {
  title: OFFERING_CHECK_TITLE,
  description: OFFERING_CHECK_DESCRIPTION,
  alternates: { canonical: OFFERING_CHECK_URL },
  openGraph: {
    title: OFFERING_CHECK_TITLE,
    description: OFFERING_CHECK_DESCRIPTION,
    url: OFFERING_CHECK_URL,
    type: "website",
    siteName: "Notra",
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: OFFERING_CHECK_TITLE,
    description: OFFERING_CHECK_DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE.url],
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

export const OFFERING_CHECK_BREADCRUMB_JSONLD = buildBreadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: OFFERING_CHECK_TITLE, url: OFFERING_CHECK_URL },
]);

export const OFFERING_CHECK_SOFTWARE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: OFFERING_CHECK_TITLE,
  url: OFFERING_CHECK_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: OFFERING_CHECK_DESCRIPTION,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};
