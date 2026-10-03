"use client";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import { ContentCalendarSkeleton } from "@/components/content/calendar/content-calendar-skeleton";
import { ContentCollectionsSection } from "@/components/content/content-collections-section";
import { ContentViewToggle } from "@/components/content/content-view-toggle";
import { LazyCreateContentDialog } from "@/components/content/lazy-create-content-dialog";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { CONTENT_LIST_VIEWS } from "@/constants/content-collections";
import type { ContentListPageClientProps } from "@/types/content/collection";

// Days, "today" and times depend on the browser's time zone, so the
// calendar renders on the client only.
const ContentCalendarView = dynamic(
  () =>
    import("@/components/content/calendar/content-calendar-view").then(
      (module) => module.ContentCalendarView
    ),
  { ssr: false, loading: () => <ContentCalendarSkeleton /> }
);

export default function PageClient({
  organizationSlug,
  initialProjectId,
}: ContentListPageClientProps) {
  const t = useTranslations("content.list");
  const tCommon2 = useTranslations("common");
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";

  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(CONTENT_LIST_VIEWS).withDefault("list")
  );
  const viewToggle = (
    <ContentViewToggle
      onViewChange={(next) => {
        void setView(next);
      }}
      view={view}
    />
  );

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="flex flex-col items-start gap-3 @min-[40rem]/main:flex-row @min-[40rem]/main:items-center @min-[40rem]/main:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {tCommon2("labels.content")}
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm text-pretty">
              {t("description")}
            </p>
          </div>
          <LazyCreateContentDialog
            entry="content_list"
            organizationId={organizationId}
            organizationSlug={organizationSlug}
          />
        </header>

        {view === "calendar" ? (
          <ContentCalendarView
            organizationId={organizationId}
            organizationSlug={organizationSlug}
            toolbarEnd={viewToggle}
          />
        ) : (
          <ContentCollectionsSection
            initialProjectId={initialProjectId}
            organizationId={organizationId}
            organizationSlug={organizationSlug}
            toolbarEnd={viewToggle}
            view={view}
          />
        )}
      </div>
    </PageContainer>
  );
}
