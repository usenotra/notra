import type { Metadata } from "next";

import { changelog } from "@/../.source/server";
import { ChangelogPageHeader } from "@/components/changelog-page-header";
import { ShowcaseOverviewGrid } from "@/components/showcase-overview-grid";
import {
  PAGE_SOCIAL_IMAGES,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SHOWCASE_COMPANIES } from "@/utils/showcase";
import { SHOWCASE_COMPANY_ICONS } from "@/utils/showcase-icons";
import { SITE_URL } from "@/utils/urls";

const title = "Changelog";
const description =
  "See how Notra transforms GitHub activity into professional product updates from real open source projects.";

export const metadata: Metadata = {
  title,
  description,
  alternates: pageAlternates(`${SITE_URL}/changelog`),
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/changelog`,
    type: "website",
    siteName: "Notra",
    images: [PAGE_SOCIAL_IMAGES.changelog],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [PAGE_SOCIAL_IMAGES.changelog.url],
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

export default async function ChangelogHubPage() {
  const postCounts = new Map(
    SHOWCASE_COMPANIES.map((company) => [
      company.slug,
      changelog.filter((entry) =>
        entry.info.path.startsWith(`${company.slug}/`)
      ).length,
    ])
  );

  const companies = SHOWCASE_COMPANIES.slice()
    .sort((left, right) => {
      const countDifference =
        (postCounts.get(right.slug) ?? 0) - (postCounts.get(left.slug) ?? 0);

      if (countDifference !== 0) {
        return countDifference;
      }

      return left.name.localeCompare(right.name);
    })
    .map((company) => ({
      ...company,
      entryCount: postCounts.get(company.slug) ?? 0,
      icon: SHOWCASE_COMPANY_ICONS[company.slug],
    }));

  return (
    <>
      <ChangelogPageHeader
        description={
          <>
            See how Notra transforms GitHub activity into professional
            <br className="hidden sm:block" />
            product updates from real open source projects.
          </>
        }
        title={
          <>
            Example <span className="text-primary">Changelogs</span>
          </>
        }
      />

      <div className="mx-auto mt-14 w-full max-w-220 px-4 sm:px-6 md:px-8 lg:px-0">
        <ShowcaseOverviewGrid companies={companies} />
      </div>

      <p className="text-muted-foreground mt-8 text-center font-sans text-xs">
        Notra is not affiliated with any of the companies listed above. These
        changelogs are generated for demonstration purposes only.
      </p>
    </>
  );
}
