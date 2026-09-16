import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Github } from "@notra/ui/components/ui/svgs/github";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ContributorsContent } from "@/components/contributors/contributors-content";
import { ContributorsPageSkeleton } from "@/components/contributors/skeleton";
import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { TrackedSignupLink } from "@/components/tracked-signup-link";
import {
  CONTRIBUTORS_HERO_SUBTITLE,
  CONTRIBUTORS_HERO_TITLE,
} from "@/constants/contributors";
import { GITHUB_REPO_URL } from "@/utils/github";
import { TWITTER_HANDLE } from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "Contributors & Community";
const description =
  "Meet the developers who build Notra. Explore open issues, pull requests, and join our community.";
const url = `${SITE_URL}/contributors`;

export const revalidate = 3600;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: {
    title,
    description,
    url,
    type: "website",
    siteName: "Notra",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

export default function ContributorsPage() {
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
            <Link
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
        <ContributorsContent />
      </Suspense>
    </div>
  );
}
