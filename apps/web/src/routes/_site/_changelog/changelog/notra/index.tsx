import { createFileRoute } from "@tanstack/react-router";

import { ChangelogPageHeader } from "@/components/changelog-page-header";
import { ChangelogTimeline } from "@/components/changelog-timeline";
import { getNotraChangelogTimeline } from "@/lib/changelog/functions";
import { buildHead } from "@/utils/head";
import {
  DEFAULT_SOCIAL_IMAGE,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "Notra Changelog";
const description =
  "Follow the latest Notra product updates, improvements, and release notes.";

export const Route = createFileRoute("/_site/_changelog/changelog/notra/")({
  loader: () => getNotraChangelogTimeline(),
  head: () =>
    buildHead({
      title,
      description,
      alternates: pageAlternates(`${SITE_URL}/changelog/notra`),
      openGraph: {
        title,
        description,
        url: `${SITE_URL}/changelog/notra`,
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
    }),
  component: NotraChangelogPage,
});

function NotraChangelogPage() {
  const timelineItems = Route.useLoaderData();

  return (
    <>
      <ChangelogPageHeader
        description={
          <>
            Every product update, release note, and improvement from the Notra
            team in one place.
          </>
        }
        title={
          <>
            The Notra <span className="text-primary">Changelog</span>
          </>
        }
      />

      <div className="mx-auto mt-14 w-full max-w-220 px-4 sm:px-6 md:px-8 lg:px-0">
        <ChangelogTimeline
          emptyDescription="We'll share new releases and product improvements here soon."
          emptyTitle="No changelog entries yet"
          items={timelineItems}
        />
      </div>
    </>
  );
}
