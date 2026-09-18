import type { Metadata } from "next";
import { Suspense } from "react";

import { McpUseCasesBrowser } from "@/components/mcp-use-cases/use-cases-browser";
import {
  MCP_USE_CASE_CATEGORY_FILTERS,
  MCP_USE_CASES,
  MCP_USE_CASES_PAGE_DESCRIPTION,
  MCP_USE_CASES_PAGE_TITLE,
  MCP_USE_CASES_PATH,
} from "@/constants/mcp-use-cases";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import { getMcpUseCaseHref } from "@/utils/mcp-use-cases";
import { PAGE_SOCIAL_IMAGES, TWITTER_HANDLE } from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const url = `${SITE_URL}${MCP_USE_CASES_PATH}`;

export const metadata: Metadata = {
  title: MCP_USE_CASES_PAGE_TITLE,
  description: MCP_USE_CASES_PAGE_DESCRIPTION,
  alternates: { canonical: url },
  openGraph: {
    title: MCP_USE_CASES_PAGE_TITLE,
    description: MCP_USE_CASES_PAGE_DESCRIPTION,
    url,
    type: "website",
    siteName: "Notra",
    images: [PAGE_SOCIAL_IMAGES.mcpServer],
  },
  twitter: {
    card: "summary_large_image",
    title: MCP_USE_CASES_PAGE_TITLE,
    description: MCP_USE_CASES_PAGE_DESCRIPTION,
    images: [PAGE_SOCIAL_IMAGES.mcpServer.url],
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "MCP Server", url: `${SITE_URL}/mcp` },
  { name: "Use Cases", url },
]);

const itemListJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: MCP_USE_CASES.map((entry, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: entry.title,
    description: entry.tagline,
    url: `${SITE_URL}${getMcpUseCaseHref(entry)}`,
  })),
};

export default function McpUseCasesPage() {
  return (
    <div className="flex w-full flex-col items-center pb-8 antialiased [font-synthesis:none]">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }}
        type="application/ld+json"
      />
      <Suspense>
        <McpUseCasesBrowser
          categories={MCP_USE_CASE_CATEGORY_FILTERS}
          useCases={MCP_USE_CASES}
        />
      </Suspense>
    </div>
  );
}
