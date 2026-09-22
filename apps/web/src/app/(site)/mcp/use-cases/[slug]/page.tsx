import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { McpUseCaseDetailView } from "@/components/mcp-use-cases/use-case-detail-view";
import { MCP_USE_CASES, MCP_USE_CASES_PATH } from "@/constants/mcp-use-cases";
import type { McpUseCaseDetailPageProps } from "@/types/mcp-use-cases";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  findMcpUseCase,
  getMcpUseCaseHref,
  getRelatedMcpUseCases,
} from "@/utils/mcp-use-cases";
import { PAGE_SOCIAL_IMAGES, TWITTER_HANDLE } from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

export const dynamicParams = false;

export function generateStaticParams() {
  return MCP_USE_CASES.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: McpUseCaseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = findMcpUseCase(slug);

  if (!entry) {
    return { title: "Use case not found" };
  }

  const title = `${entry.title} · Notra MCP use case`;
  const description = entry.tagline;
  const url = `${SITE_URL}${getMcpUseCaseHref(entry)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
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
  };
}

export default async function McpUseCaseDetailPage({
  params,
}: McpUseCaseDetailPageProps) {
  const { slug } = await params;
  const entry = findMcpUseCase(slug);

  if (!entry) {
    notFound();
  }

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
