import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Await, createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { ContributorsContent } from "@/components/contributors/contributors-content";
import { ContributorsPageSkeleton } from "@/components/contributors/skeleton";
import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { TrackedSignupLink } from "@/components/tracked-signup-link";
import {
  CONTRIBUTORS_HERO_SUBTITLE,
  CONTRIBUTORS_HERO_TITLE,
} from "@/constants/contributors";
import { getContributorsData } from "@/lib/contributors/functions";
import type { Metadata } from "@/types/metadata";
import { GITHUB_REPO_URL } from "@/utils/github";
import { buildHead } from "@/utils/head";
import { TWITTER_HANDLE, pageAlternates } from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "Contributors & Community";
const description =
  "Meet the developers who build Notra. Explore open issues, pull requests, and join our community.";
const url = `${SITE_URL}/contributors`;

const metadata: Metadata = {
  title,
  description,
  alternates: pageAlternates(url),
  openGraph: {
    title,
    description,
    url,
    type: "website",
    siteName: "Notra",
    images: [
      {
        url: `${url}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "Notra contributors and community",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

export const Route = createFileRoute("/_site/contributors/")({
  loader: () => ({ data: getContributorsData() }),
  headers: () => ({
    "Cache-Control":
      "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
  }),
  head: () => buildHead(metadata),
  pendingComponent: ContributorsLoading,
  component: ContributorsPage,
});

function ContributorsLoading() {
  return (
    <div className="flex w-full flex-col items-center justify-start overflow-hidden">
      <MarketingHeroWash
        subtitle={CONTRIBUTORS_HERO_SUBTITLE}
        title={CONTRIBUTORS_HERO_TITLE}
      />
      <ContributorsPageSkeleton />
    </div>
  );
}

function ContributorsPage() {
  const { data } = Route.useLoaderData();

  return (
    <div className="flex w-full flex-col items-center justify-start overflow-hidden">
      <MarketingHeroWash
        subtitle={CONTRIBUTORS_HERO_SUBTITLE}
        title={CONTRIBUTORS_HERO_TITLE}
      >
        <CtaButton
          nativeButton={false}
          render={<TrackedSignupLink source="contributors_cta" />}
          variant="primary"
        >
          Try Notra for free
        </CtaButton>
        <CtaButton
          nativeButton={false}
          render={
            <a
              href={GITHUB_REPO_URL}
              rel="noopener noreferrer"
              target="_blank"
            />
          }
          variant="light"
        >
          <Github className="size-4" />
          View on GitHub
        </CtaButton>
      </MarketingHeroWash>

      <Suspense fallback={<ContributorsPageSkeleton />}>
        <Await promise={data}>
          {(contributors) => <ContributorsContent data={contributors} />}
        </Await>
      </Suspense>
    </div>
  );
}
