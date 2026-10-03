import type { FeatureDetailCopy } from "@/types/feature-detail-page";
import type { Metadata } from "@/types/metadata";
import { buildHead } from "@/utils/head";
import { buildBreadcrumbJsonLd } from "@/utils/jsonld";
import {
  PAGE_SOCIAL_IMAGES,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

export function buildFeatureDetailHead({ meta }: FeatureDetailCopy) {
  const url = `${SITE_URL}${meta.path}`;
  const image = PAGE_SOCIAL_IMAGES[meta.ogImageKey];

  const metadata: Metadata = {
    title: meta.title,
    description: meta.description,
    alternates: pageAlternates(url),
    openGraph: {
      title: meta.title,
      description: meta.description,
      url,
      type: "website",
      siteName: "Notra",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [image.url],
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
    },
  };

  return buildHead(metadata);
}

export function buildFeatureDetailBreadcrumb({ meta }: FeatureDetailCopy) {
  return buildBreadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Features", url: `${SITE_URL}/features` },
    { name: meta.title, url: `${SITE_URL}${meta.path}` },
  ]);
}
