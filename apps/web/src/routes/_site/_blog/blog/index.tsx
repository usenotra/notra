import { createFileRoute } from "@tanstack/react-router";

import { BlogPostCard } from "@/components/blog-post-card";
import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { getBlogCardItems } from "@/lib/blog/functions";
import type { Metadata } from "@/types/metadata";
import { buildHead } from "@/utils/head";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  DEFAULT_SOCIAL_IMAGE,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "Notra Blog";
const description = "Insights, guides, and stories from the Notra team.";

const metadata: Metadata = {
  title,
  description,
  alternates: pageAlternates(`${SITE_URL}/blog`),
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/blog`,
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
  { name: "Blog", url: `${SITE_URL}/blog` },
]);

export const Route = createFileRoute("/_site/_blog/blog/")({
  loader: () => getBlogCardItems(),
  head: () => buildHead(metadata),
  component: BlogPage,
});

function BlogPage() {
  const cardItems = Route.useLoaderData();

  return (
    <div className="flex w-full flex-col items-center gap-12 md:gap-16">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload is server-built and script-close-escaped
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <MarketingHeroWash
        subtitle={description}
        title={
          <>
            The Notra <span className="text-primary">Blog</span>
          </>
        }
      />

      {cardItems.length === 0 ? (
        <div className="w-full max-w-220 px-4 sm:px-6 md:px-0">
          <div className="rounded-3xl border border-[#1E1E1E1A] bg-[#C8B2EE26] px-6 py-16 text-center dark:border-white/10 dark:bg-white/[0.02]">
            <h2 className="font-display text-xl font-medium tracking-[-0.015em] text-[#1E1E1E] dark:text-white">
              No posts yet
            </h2>
            <p className="mt-2 font-sans text-sm leading-6 text-[#1E1E1E99] dark:text-white/60">
              We&apos;ll share new articles and insights here soon.
            </p>
          </div>
        </div>
      ) : (
        <ul className="grid w-full max-w-220 grid-cols-1 gap-6 px-4 sm:grid-cols-2 sm:px-6 md:px-0">
          {cardItems.map((item) => (
            <li className="h-full" key={item.id}>
              <BlogPostCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
