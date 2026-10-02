import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { ChangelogPageHeader } from "@/components/changelog-page-header";
import { ChangelogTimeline } from "@/components/changelog-timeline";
import { getShowcaseCompanyChangelog } from "@/lib/changelog/functions";
import { buildHead } from "@/utils/head";
import {
  DEFAULT_SOCIAL_IMAGE,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

export const Route = createFileRoute("/_site/_changelog/changelog/$name/")({
  loader: ({ params }) =>
    getShowcaseCompanyChangelog({ data: { name: params.name } }),
  head: ({ loaderData, params }) => {
    const company = loaderData?.company;
    if (!company) {
      return {};
    }
    const title = { absolute: `${company.name} Changelog` };
    const description = `${company.description} See AI-generated changelogs powered by Notra.`;
    const url = `${SITE_URL}/changelog/${params.name}`;
    return buildHead({
      title,
      description,
      alternates: pageAlternates(url),
      openGraph: {
        title: title.absolute,
        description,
        url,
        type: "website",
        siteName: "Notra",
        images: [DEFAULT_SOCIAL_IMAGE],
      },
      twitter: {
        card: "summary_large_image",
        title: title.absolute,
        description,
        images: [DEFAULT_SOCIAL_IMAGE.url],
        site: TWITTER_HANDLE,
        creator: TWITTER_HANDLE,
      },
    });
  },
  component: ShowcaseCompanyPage,
});

function ShowcaseCompanyPage() {
  const { company, items } = Route.useLoaderData();

  return (
    <>
      <ChangelogPageHeader
        description={
          <>
            Changelog entries generated from GitHub activity,
            <br className="hidden sm:block" />
            powered by Notra.
          </>
        }
        meta={
          <a
            className="text-muted-foreground/60 hover:text-foreground inline-flex items-center gap-1 font-sans text-sm transition-colors"
            href={`${company.url}?utm_source=usenotra.com`}
            target="_blank"
          >
            {company.domain}
            <HugeiconsIcon className="size-3.5" icon={ArrowUpRight01Icon} />
          </a>
        }
        title={
          <>
            {company.name} <span className="text-primary">Changelog</span>
          </>
        }
      />

      <div className="mx-auto mt-8 w-full max-w-220 px-4 sm:px-6 md:px-8 lg:px-0">
        <Link
          className="text-foreground/50 hover:text-foreground inline-flex items-center gap-1 font-sans text-sm transition-colors"
          to="/changelog"
        >
          &larr; All changelogs
        </Link>
      </div>

      <div className="mx-auto mt-8 w-full max-w-220 px-4 sm:px-6 md:px-8 lg:px-0">
        <ChangelogTimeline items={items} />
      </div>
    </>
  );
}
