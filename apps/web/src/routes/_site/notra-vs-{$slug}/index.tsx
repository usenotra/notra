import { createFileRoute, notFound } from "@tanstack/react-router";

import { CompareDetailView } from "@/components/compare/compare-detail-view";
import { COMPARE_PATH } from "@/constants/compare/page";
import {
  buildCompareFaqJsonLd,
  findCompareCompetitor,
  getCompareHref,
  getCompareMetaTitle,
  getCompareTitle,
  getRelatedCompareCompetitors,
} from "@/utils/compare";
import { buildHead } from "@/utils/head";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import { TWITTER_HANDLE, pageAlternates } from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

export const Route = createFileRoute("/_site/notra-vs-{$slug}/")({
  loader: ({ params }) => {
    const competitor = findCompareCompetitor(params.slug);
    if (!competitor) {
      throw notFound();
    }
    return competitor;
  },
  head: ({ loaderData: competitor }) => {
    if (!competitor) {
      return buildHead({ title: "Comparison not found" });
    }

    const title = getCompareMetaTitle(competitor);
    const description = competitor.metaDescription;
    const url = `${SITE_URL}${getCompareHref(competitor)}`;
    const image = {
      url: `${url}/opengraph-image`,
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      alt: getCompareTitle(competitor),
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
  component: CompareDetailPage,
});

function CompareDetailPage() {
  const competitor = Route.useLoaderData();

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Compare", url: `${SITE_URL}${COMPARE_PATH}` },
    {
      name: getCompareTitle(competitor),
      url: `${SITE_URL}${getCompareHref(competitor)}`,
    },
  ]);

  return (
    <div className="flex w-full flex-col items-center antialiased [font-synthesis:none]">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildCompareFaqJsonLd(competitor)),
        }}
        type="application/ld+json"
      />
      <CompareDetailView
        competitor={competitor}
        related={getRelatedCompareCompetitors(competitor)}
      />
    </div>
  );
}
