import { createFileRoute } from "@tanstack/react-router";

import { CompareIndexView } from "@/components/compare/compare-index-view";
import { COMPARE_COMPETITORS } from "@/constants/compare/competitors";
import {
  COMPARE_INDEX_DESCRIPTION,
  COMPARE_INDEX_TITLE,
  COMPARE_PATH,
} from "@/constants/compare/page";
import { getCompareHref, getCompareTitle } from "@/utils/compare";
import { buildHead } from "@/utils/head";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  PAGE_SOCIAL_IMAGES,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const url = `${SITE_URL}${COMPARE_PATH}`;

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Compare", url },
]);

const itemListJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: COMPARE_COMPETITORS.map((competitor, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: getCompareTitle(competitor),
    description: competitor.summary,
    url: `${SITE_URL}${getCompareHref(competitor)}`,
  })),
};

export const Route = createFileRoute("/_site/compare/")({
  head: () =>
    buildHead({
      title: COMPARE_INDEX_TITLE,
      description: COMPARE_INDEX_DESCRIPTION,
      alternates: pageAlternates(url),
      openGraph: {
        title: COMPARE_INDEX_TITLE,
        description: COMPARE_INDEX_DESCRIPTION,
        url,
        type: "website",
        siteName: "Notra",
        images: [PAGE_SOCIAL_IMAGES.features],
      },
      twitter: {
        card: "summary_large_image",
        title: COMPARE_INDEX_TITLE,
        description: COMPARE_INDEX_DESCRIPTION,
        images: [PAGE_SOCIAL_IMAGES.features.url],
        site: TWITTER_HANDLE,
        creator: TWITTER_HANDLE,
      },
    }),
  component: ComparePage,
});

function ComparePage() {
  return (
    <>
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
      <CompareIndexView competitors={COMPARE_COMPETITORS} />
    </>
  );
}
