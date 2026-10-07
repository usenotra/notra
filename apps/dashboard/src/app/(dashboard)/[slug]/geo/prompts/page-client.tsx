"use client";

import {
  AiChat02Icon,
  BubbleChatQuestionIcon,
  Loading03Icon,
  MessageMultiple01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PageHeading } from "@notra/ui/components/shared/page-heading";
import {
  IconTabsList,
  IconTabsTrigger,
} from "@notra/ui/components/ui/icon-tabs";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { Google } from "@notra/ui/components/ui/svgs/google";
import { Tabs, TabsContent } from "@notra/ui/components/ui/tabs";
import { useHotkey } from "@tanstack/react-hotkeys";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { useLocale, useTranslations } from "use-intl";

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
import { useRouter } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { PromptsPageTabCountProps } from "@/types/geo";
import { formatCount } from "@/utils/format";
import { withGeoProject } from "@/utils/geo-paths";

import { GeoPromptsSkeleton } from "./skeleton";

interface PageClientProps {
  organizationSlug: string;
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
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <PageHeading
            description={t("description")}
            title={tCommon("labels.prompts")}
          />
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
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <PageHeading
            description={t("description")}
            title={tCommon("labels.prompts")}
          >
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
          </PageHeading>
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
                <IconTabsList value={tab}>
                  <IconTabsTrigger
                    icon={
                      <HugeiconsIcon icon={BubbleChatQuestionIcon} size={15} />
                    }
                    value="prompts"
                  >
                    {tCommon("labels.prompts")}
                    <TabCount count={prompts.length} />
                  </IconTabsTrigger>
                  <IconTabsTrigger
                    icon={
                      <HugeiconsIcon icon={MessageMultiple01Icon} size={15} />
                    }
                    value="conversations"
                  >
                    {tGeoShared("conversations")}
                    <TabCount count={sequences.length} />
                  </IconTabsTrigger>
                  <IconTabsTrigger
                    icon={<Google className="size-3.5" />}
                    value="suggestions"
                  >
                    {t("tabs.suggestions")}
                    <TabCount count={suggestionsData?.suggestions.length} />
                  </IconTabsTrigger>
                  <IconTabsTrigger
                    icon={
                      <HugeiconsIcon
                        className={
                          isScanning
                            ? "text-primary motion-safe:animate-spin"
                            : undefined
                        }
                        icon={isScanning ? Loading03Icon : AiChat02Icon}
                        size={15}
                      />
                    }
                    iconPinned={isScanning}
                    onFocus={prefetchAnswers}
                    onPointerEnter={prefetchAnswers}
                    value="answers"
                  >
                    {t("tabs.answers")}
                    {isScanning ? (
                      <span className="sr-only">
                        {tGeoShared("scanningEngines")}
                      </span>
                    ) : null}
                  </IconTabsTrigger>
                </IconTabsList>
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
