import type { ChangelogTimelineProps } from "~types/changelog";

import { ChangelogFeaturedEntry } from "@/components/changelog-featured-entry";
import { ChangelogRow } from "@/components/changelog-row";

export function ChangelogTimeline({
  items,
  featuredLabel = "Latest",
  emptyTitle = "No updates yet",
  emptyDescription = "Check back soon for the latest product updates.",
}: ChangelogTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl bg-[#C8B2EE1A] px-6 py-12 text-center ring-1 ring-[#1E1E1E1A] dark:bg-white/[0.03] dark:ring-white/10">
        <h2 className="font-display text-foreground text-xl font-semibold">
          {emptyTitle}
        </h2>
        <p className="text-muted-foreground mt-2 font-sans text-sm leading-6">
          {emptyDescription}
        </p>
      </div>
    );
  }

  const [featured, ...rest] = items;

  if (!featured) {
    return null;
  }

  return (
    <div className="flex flex-col gap-14">
      <ChangelogFeaturedEntry item={featured} label={featuredLabel} />
      {rest.length > 0 ? (
        <div className="flex flex-col gap-10">
          {rest.map((item) => (
            <ChangelogRow item={item} key={item.id} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
