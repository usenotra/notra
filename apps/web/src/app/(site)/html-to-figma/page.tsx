import type { Metadata } from "next";

import HtmlExportShell from "@/components/html-to-figma/html-export-shell";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  DEFAULT_SOCIAL_IMAGE,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "HTML to Figma";
const description =
  "Paste any HTML and copy it as editable Figma layers. Runs entirely in your browser. Free, no sign-up.";
const url = `${SITE_URL}/html-to-figma`;

export const metadata: Metadata = {
  title,
  description,
  alternates: pageAlternates(url),
  openGraph: {
    title,
    description,
    url,
    type: "website",
    siteName: "Notra",
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [DEFAULT_SOCIAL_IMAGE.url],
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "HTML to Figma", url },
]);

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "HTML to Figma",
  url,
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function HtmlToFigmaPage() {
  return (
    <>
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(softwareJsonLd) }}
        type="application/ld+json"
      />

      <HtmlExportShell
        subtitle="Paste any HTML and copy it as editable layers, straight into Figma. Conversion runs entirely in your browser, so nothing is uploaded."
        target="figma"
        title={
          <>
            Turn HTML into <span className="text-primary">Figma</span> layers
          </>
        }
      />
    </>
  );
}
