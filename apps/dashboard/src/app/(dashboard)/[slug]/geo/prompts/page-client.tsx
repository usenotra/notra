"use client";

import {
  AiChat02Icon,
  BubbleChatQuestionIcon,
  Loading03Icon,
  MessageMultiple01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { Google } from "@notra/ui/components/ui/svgs/google";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { ConversationsCard } from "@/components/geo/conversations-card";
import { PromptsCsvImportDialog } from "@/components/geo/geo-csv-import-dialog";
import { GeoRangePicker } from "@/components/geo/geo-range-picker";
import { GeoSetupButton } from "@/components/geo/geo-setup-button";
import { PromptAddDialog } from "@/components/geo/prompt-add-dialog";
import { PromptSuggestions } from "@/components/geo/prompt-suggestions";
import { PromptsTable } from "@/components/geo/prompts-table";
import { ScanRunDetail } from "@/components/geo/scan-run-detail";
import { SlidingTabIndicator } from "@/components/geo/sliding-tab-indicator";
import { PageContainer } from "@/components/layout/container";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { GeoScanControlsProvider } from "@/components/providers/geo-scan-controls-provider";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import {
  GEO_PROMPT_DETAIL_QUERY_KEY,
  GEO_PROMPTS_PAGE_TABS,
} from "@/constants/geo-prompts";
import {
  useGeoPromptResults,
  useGeoSettings,
  useGeoSuggestions,
  useIsGeoScanning,
} from "@/lib/hooks/use-geo";
import { useGeoPromptsDb, useGeoSequencesDb } from "@/lib/hooks/use-geo-db";
import { useGeoRange } from "@/lib/hooks/use-geo-range";
import { usePrefetchGeoLatestScanRun } from "@/lib/hooks/use-geo-scan-history";
import { cn } from "@/lib/utils";
import type {
  PromptsPageTabCountProps,
  PromptsPageTabIconProps,
} from "@/types/geo";
import { formatCount } from "@/utils/format";
import { withGeoProject } from "@/utils/geo-paths";

import { GeoPromptsSkeleton } from "./skeleton";

interface PageClientProps {
  organizationSlug: string;
}

/**
 * Icon that only shows on the active tab: it widens and fades in beside the
 * label, so inactive tabs stay text-only. `SlidingTabIndicator` follows the
 * resize frame by frame. `pinned` keeps it visible anyway,
 * e.g. for a live scan spinner.
 */
function SlideInTabIcon({ children, pinned = false }: PromptsPageTabIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "duration-normal ease-emphasized -me-1.5 flex w-0 shrink-0 items-center justify-center overflow-hidden opacity-0 transition-all group-data-active/tab:me-0 group-data-active/tab:w-4 group-data-active/tab:opacity-100 motion-reduce:transition-none",
        pinned && "me-0 w-4 opacity-100"
      )}
    >
      <span
        className={cn(
          "duration-normal ease-emphasized flex scale-50 items-center transition-transform group-data-active/tab:scale-100 motion-reduce:transition-none",
          pinned && "scale-100"
        )}
      >
        {children}
      </span>
    </span>
  );
}

function TabCount({ count }: PromptsPageTabCountProps) {
  const locale = useLocale();
  if (count === undefined || count === 0) {
    return null;
  }
  return (
    <span className="text-muted-foreground/70 text-xs font-normal tabular-nums">
      {formatCount(count, locale)}
    </span>
  );
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const t = useTranslations("geo.pages.prompts");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const tShared = useTranslations("geo.pages.shared");
  const { projectId } = useGeoProjectScope();
  const router = useRouter();
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";

  const geoRange = useGeoRange();
  const { data: settingsData, isPending } = useGeoSettings(organizationId);
  const { prompts } = useGeoPromptsDb(organizationId);
  const { data: promptResults } = useGeoPromptResults(
    organizationId,
    geoRange.query
  );
  const isScanning = useIsGeoScanning(organizationId);
  const prefetchAnswers = usePrefetchGeoLatestScanRun(organizationId);
  const { sequences } = useGeoSequencesDb(organizationId);
  const { data: suggestionsData } = useGeoSuggestions(organizationId);
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(GEO_PROMPTS_PAGE_TABS)
      .withDefault("prompts")
      .withOptions({ clearOnDefault: true })
  );
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // Tabs render their own actions into this slot, beside the tab switcher.
  const [tabActionsSlot, setTabActionsSlot] = useState<HTMLDivElement | null>(
    null
  );

  useHotkey("P", () => setAddOpen(true), { enabled: !addOpen && !importOpen });

  if (isPending) {
    return <GeoPromptsSkeleton />;
  }

  if (!settingsData?.settings) {
    return (
      <PageContainer
        className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6"
        variant="default"
      >
        <div className="w-full space-y-6 px-4 lg:px-6">
          <header className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {tCommon("labels.prompts")}
            </h1>
            <p className="text-muted-foreground">{t("description")}</p>
          </header>
          <EmptyState
            action={<GeoSetupButton organizationId={organizationId} />}
            description={t("setupDescription")}
            preview={
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.prompts}
                rows={EMPTY_STATE_TABLE_ROWS}
              />
            }
            title={tShared("notSetUpTitle")}
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <GeoScanControlsProvider
      key={`${organizationId}:${projectId ?? "default"}`}
      organizationId={organizationId}
      promptCount={prompts.filter((prompt) => prompt.enabled).length}
    >
      <PageContainer
        className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6"
        variant="default"
      >
        <div className="w-full space-y-6 px-4 lg:px-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">
                {tCommon("labels.prompts")}
              </h1>
              <p className="text-muted-foreground">{t("description")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="gap-1.5"
                onClick={() => setAddOpen(true)}
                size="sm"
              >
                <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
                {tGeoShared("addPrompt")}
                <Kbd className="ml-1 hidden sm:inline-flex">P</Kbd>
              </Button>
            </div>
          </header>
          <Tabs
            onValueChange={(value) => {
              const next = GEO_PROMPTS_PAGE_TABS.find(
                (option) => option === value
              );
              void setTab(next ?? "prompts");
            }}
            value={tab}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="max-w-full overflow-x-auto">
                <TabsList indicator={false}>
                  <SlidingTabIndicator value={tab} />
                  <TabsTrigger className="group/tab" value="prompts">
                    <SlideInTabIcon>
                      <HugeiconsIcon icon={BubbleChatQuestionIcon} size={15} />
                    </SlideInTabIcon>
                    {tCommon("labels.prompts")}
                    <TabCount count={prompts.length} />
                  </TabsTrigger>
                  <TabsTrigger className="group/tab" value="conversations">
                    <SlideInTabIcon>
                      <HugeiconsIcon icon={MessageMultiple01Icon} size={15} />
                    </SlideInTabIcon>
                    {tGeoShared("conversations")}
                    <TabCount count={sequences.length} />
                  </TabsTrigger>
                  <TabsTrigger className="group/tab" value="suggestions">
                    <SlideInTabIcon>
                      <Google className="size-3.5" />
                    </SlideInTabIcon>
                    {t("tabs.suggestions")}
                    <TabCount count={suggestionsData?.suggestions.length} />
                  </TabsTrigger>
                  <TabsTrigger
                    className="group/tab"
                    onFocus={prefetchAnswers}
                    onPointerEnter={prefetchAnswers}
                    value="answers"
                  >
                    <SlideInTabIcon pinned={isScanning}>
                      <HugeiconsIcon
                        className={
                          isScanning
                            ? "text-primary motion-safe:animate-spin"
                            : undefined
                        }
                        icon={isScanning ? Loading03Icon : AiChat02Icon}
                        size={15}
                      />
                    </SlideInTabIcon>
                    {t("tabs.answers")}
                    {isScanning ? (
                      <span className="sr-only">
                        {tGeoShared("scanningEngines")}
                      </span>
                    ) : null}
                  </TabsTrigger>
                </TabsList>
              </div>
              {tab === "prompts" ? <GeoRangePicker control={geoRange} /> : null}
              <div
                className="flex flex-wrap items-center gap-2 empty:hidden"
                ref={setTabActionsSlot}
              />
            </div>
            <TabsContent className="mt-4" value="prompts">
              <PromptsTable
                isScanning={isScanning}
                onAddPrompt={() => setAddOpen(true)}
                onImportCsv={() => setImportOpen(true)}
                organizationId={organizationId}
                prompts={prompts}
                results={promptResults?.results ?? []}
              />
            </TabsContent>
            <TabsContent className="mt-4" value="conversations">
              <ConversationsCard
                actionsContainer={tabActionsSlot}
                organizationId={organizationId}
              />
            </TabsContent>
            <TabsContent className="mt-4" value="suggestions">
              <PromptSuggestions
                callbackPath={withGeoProject(
                  `/${organizationSlug}/geo/prompts?tab=suggestions`,
                  projectId
                )}
                onViewTrackedPrompt={(promptId) => {
                  // A full URL, not query state: the toast that calls this
                  // can outlive the page.
                  const query = promptId
                    ? `?${GEO_PROMPT_DETAIL_QUERY_KEY}=${encodeURIComponent(promptId)}`
                    : "";
                  router.push(
                    withGeoProject(
                      `/${organizationSlug}/geo/prompts${query}`,
                      projectId
                    )
                  );
                }}
                organizationId={organizationId}
              />
            </TabsContent>
            <TabsContent className="mt-4" value="answers">
              <ScanRunDetail organizationId={organizationId} />
            </TabsContent>
          </Tabs>
        </div>
        <PromptAddDialog
          onImportCsv={() => setImportOpen(true)}
          onOpenChange={setAddOpen}
          open={addOpen}
          organizationId={organizationId}
        />
        <PromptsCsvImportDialog
          onOpenChange={setImportOpen}
          open={importOpen}
          organizationId={organizationId}
        />
      </PageContainer>
    </GeoScanControlsProvider>
  );
}
