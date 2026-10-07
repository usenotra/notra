"use client";

import { Calendar03Icon, ListViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { useTranslations } from "use-intl";

import { ContentCalendarSkeleton } from "@/components/content/calendar/content-calendar-skeleton";
import { ContentCollectionsSection } from "@/components/content/content-collections-section";
import { LazyCreateContentDialog } from "@/components/content/lazy-create-content-dialog";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { CONTENT_CALENDAR_DATE_PARAM } from "@/constants/content-calendar";
import { CONTENT_LIST_VIEWS } from "@/constants/content-collections";
import type { ContentListPageClientProps } from "@/types/content/collection";
import dynamic from "@/utils/lazy-component";

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
    parseAsStringLiteral(CONTENT_LIST_VIEWS)
      .withDefault("list")
      .withOptions({ clearOnDefault: true })
  );
  const [, setCalendarDate] = useQueryState(CONTENT_CALENDAR_DATE_PARAM);
  // The calendar renders its month navigation into the end of the tab row.
  const [tabRowEnd, setTabRowEnd] = useState<HTMLDivElement | null>(null);

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description={t("description")}
          title={tCommon2("labels.content")}
        >
          <LazyCreateContentDialog
            entry="content_list"
            organizationId={organizationId}
            organizationSlug={organizationSlug}
          />
        </PageHeading>

        <div className="space-y-3">
          <Tabs
            onValueChange={(value) => {
              const next = CONTENT_LIST_VIEWS.find(
                (option) => option === value
              );
              void setView(next ?? "list");
              // Coming back to the calendar starts at the current month.
              void setCalendarDate(null);
            }}
            value={view}
          >
            <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="list">
                  <HugeiconsIcon aria-hidden="true" icon={ListViewIcon} />
                  {t("allContent")}
                </TabsTrigger>
                <TabsTrigger value="calendar">
                  <HugeiconsIcon aria-hidden="true" icon={Calendar03Icon} />
                  {t("viewCalendar")}
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center" ref={setTabRowEnd} />
            </div>
          </Tabs>

          {view === "calendar" ? (
            <ContentCalendarView
              organizationId={organizationId}
              organizationSlug={organizationSlug}
              toolbarContainer={tabRowEnd}
            />
          ) : (
            <ContentCollectionsSection
              initialProjectId={initialProjectId}
              organizationId={organizationId}
              organizationSlug={organizationSlug}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
