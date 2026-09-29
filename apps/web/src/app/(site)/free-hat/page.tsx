import type { Metadata } from "next";

import { MerchClaim } from "@/components/merch/merch-claim";
import { MerchCtaBanner } from "@/components/merch/merch-cta-banner";
import { MerchGallery } from "@/components/merch/merch-gallery";
import { MerchHero } from "@/components/merch/merch-hero";
import { MerchSpecs } from "@/components/merch/merch-specs";
import { MerchTweets } from "@/components/merch/merch-tweets";
import {
  PAGE_SOCIAL_IMAGES,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "Merch";
const description =
  "The Notra Classic Hat, our gift to paid workspaces. Reach out and we'll put one in the mail.";
const url = `${SITE_URL}/free-hat`;

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
    images: [PAGE_SOCIAL_IMAGES.freeHat],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [PAGE_SOCIAL_IMAGES.freeHat.url],
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

export default function MerchPage() {
  return (
    <>
      <MerchHero />
      <MerchGallery />
      <MerchSpecs />
      <MerchClaim />
      <MerchTweets />
      <section className="content-defer w-full px-6 pt-27.5 lg:px-20">
        <MerchCtaBanner />
      </section>
    </>
  );
}
