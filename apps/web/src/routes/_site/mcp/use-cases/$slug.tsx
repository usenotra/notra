import { createFileRoute, notFound } from "@tanstack/react-router";

import { McpUseCaseDetailView } from "@/components/mcp-use-cases/use-case-detail-view";
import { MCP_USE_CASES_PATH } from "@/constants/mcp-use-cases";
import { buildHead } from "@/utils/head";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  findMcpUseCase,
  getMcpUseCaseHref,
  getRelatedMcpUseCases,
} from "@/utils/mcp-use-cases";
import {
  PAGE_SOCIAL_IMAGES,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

export const Route = createFileRoute("/_site/mcp/use-cases/$slug")({
  loader: ({ params }) => {
    const entry = findMcpUseCase(params.slug);
    if (!entry) {
      throw notFound();
    }
    return entry;
  },
  head: ({ loaderData: entry }) => {
    if (!entry) {
      return buildHead({ title: "Use case not found" });
    }

    const title = `${entry.title} · Notra MCP use case`;
    const description = entry.tagline;
    const url = `${SITE_URL}${getMcpUseCaseHref(entry)}`;

    return buildHead({
      title,
      description,
      alternates: pageAlternates(url),
      openGraph: {
        title,
        description,
        url,
        type: "article",
        siteName: "Notra",
        images: [PAGE_SOCIAL_IMAGES.mcpServer],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [PAGE_SOCIAL_IMAGES.mcpServer.url],
        site: TWITTER_HANDLE,
        creator: TWITTER_HANDLE,
      },
    });
  },
  component: McpUseCaseDetailPage,
});

function McpUseCaseDetailPage() {
  const entry = Route.useLoaderData();

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "MCP Server", url: `${SITE_URL}/mcp` },
    { name: "Use Cases", url: `${SITE_URL}${MCP_USE_CASES_PATH}` },
    { name: entry.title, url: `${SITE_URL}${getMcpUseCaseHref(entry)}` },
  ]);

  return (
    <div className="flex w-full flex-col items-center antialiased [font-synthesis:none]">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <McpUseCaseDetailView
        related={getRelatedMcpUseCases(entry)}
        entry={entry}
      />
    </div>
  );
}
