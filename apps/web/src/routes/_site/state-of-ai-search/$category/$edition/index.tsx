import { createFileRoute, notFound } from "@tanstack/react-router";

import { ReportView } from "@/components/state-of-ai-search/report-view";
import {
  STATE_OF_AI_SEARCH_TITLE,
  STATE_OF_AI_SEARCH_URL,
} from "@/constants/state-of-ai-search";
import {
  listLatestSummaries,
  loadReport,
} from "@/lib/state-of-ai-search/reports";
import { buildHead } from "@/utils/head";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import { TWITTER_HANDLE, pageAlternates } from "@/utils/metadata";
import {
  reportDescription,
  reportPath,
  reportTitle,
} from "@/utils/state-of-ai-search";
import { SITE_URL } from "@/utils/urls";

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

export const Route = createFileRoute(
  "/_site/state-of-ai-search/$category/$edition/"
)({
  loader: async ({ params }) => {
    const report = await loadReport(params.category, params.edition);
    if (!report) {
      throw notFound();
    }
    const otherReports = listLatestSummaries().filter(
      (other) => other.slug !== report.slug
    );
    return { report, otherReports };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return buildHead({ title: "Report not found" });
    }
    const { report } = loaderData;
    const title = reportTitle(report);
    const description = reportDescription(report);
    const url = `${SITE_URL}${reportPath(report.slug, report.edition)}`;
    const image = {
      url: `${url}/opengraph-image`,
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      alt: title,
    };
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
        images: [image],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image.url],
        site: TWITTER_HANDLE,
        creator: TWITTER_HANDLE,
      },
    });
  },
  component: StateOfAiSearchReportPage,
});

function StateOfAiSearchReportPage() {
  const { report, otherReports } = Route.useLoaderData();
  const url = `${SITE_URL}${reportPath(report.slug, report.edition)}`;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: STATE_OF_AI_SEARCH_TITLE, url: STATE_OF_AI_SEARCH_URL },
    { name: reportTitle(report), url },
  ]);
  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: reportTitle(report),
    description: reportDescription(report),
    url,
    datePublished: report.publishedAt,
    creator: { "@type": "Organization", name: "Notra", url: SITE_URL },
    license: "https://creativecommons.org/licenses/by/4.0/",
    distribution: {
      "@type": "DataDownload",
      encodingFormat: "text/csv",
      contentUrl: `${url}/data.csv`,
    },
  };

  return (
    <div className="flex w-full flex-col items-center">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(datasetJsonLd) }}
        type="application/ld+json"
      />
      <ReportView otherReports={otherReports} report={report} />
    </div>
  );
}
