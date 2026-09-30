import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ShowcaseCompanyPageProps } from "~types/showcase";

import { changelog } from "@/../.source/server";
import { ChangelogPageHeader } from "@/components/changelog-page-header";
import { ChangelogTimeline } from "@/components/changelog-timeline";
import {
  DEFAULT_SOCIAL_IMAGE,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import {
  getShowcaseCompany,
  getShowcaseEntrySlug,
  SHOWCASE_COMPANIES,
} from "@/utils/showcase";
import { SITE_URL } from "@/utils/urls";

export function generateStaticParams() {
  return SHOWCASE_COMPANIES.map((company) => ({ name: company.slug }));
}

export async function generateMetadata({
  params,
}: ShowcaseCompanyPageProps): Promise<Metadata> {
  const { name } = await params;
  const company = getShowcaseCompany(name);

  if (!company) {
    return {};
  }

  const title = { absolute: `${company.name} Changelog` };
  const description = `${company.description} See AI-generated changelogs powered by Notra.`;
  const url = `${SITE_URL}/changelog/${name}`;

  return {
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
  };
}

export default async function ShowcaseCompanyPage({
  params,
}: ShowcaseCompanyPageProps) {
  const { name } = await params;
  const company = getShowcaseCompany(name);

  if (!company) {
    notFound();
  }

  const items = changelog
    .filter((entry) => entry.info.path.startsWith(`${name}/`))
    .sort(
      (left, right) =>
        new Date(right.date).getTime() - new Date(left.date).getTime()
    )
    .map((entry) => ({
      id: entry.info.path,
      title: entry.title,
      description: entry.description,
      href: `/changelog/${name}/${getShowcaseEntrySlug(entry.info.path)}`,
      date: entry.date,
    }));

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
          href="/changelog"
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
