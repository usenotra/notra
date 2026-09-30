"use client";

import {
  BubbleChatQuestionIcon,
  Copy01Icon,
  Delete02Icon,
  PauseIcon,
  PlayIcon,
  PlusSignIcon,
  SearchIcon,
  Tag01Icon,
  Upload01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PROMPTS_TABLE_HEIGHT,
  PROMPTS_TABLE_ROW_HEIGHT,
} from "@notra/geo-core/constants/geo";
import { collectPromptTags } from "@notra/geo-core/utils/geo-prompt-tags";
import {
  GEO_PROMPT_FILTER_ALL,
  GEO_PROMPT_INTENT_FILTER_VALUES,
  GEO_PROMPT_SOURCE_FILTER_VALUES,
} from "@notra/schemas/constants/dashboard/geo-prompts";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from "@notra/ui/components/ui/context-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@notra/ui/components/ui/empty";
import { Input } from "@notra/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Switch } from "@notra/ui/components/ui/switch";
import { useTranslations } from "next-intl";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { GeoRemoveDialog } from "@/components/geo/geo-remove-dialog";
import {
  PromptIntentBadge,
  PromptPresenceBadge,
} from "@/components/geo/prompt-badges";
import { PromptDetailDialog } from "@/components/geo/prompt-detail-dialog";
import { PromptTagsActionDialog } from "@/components/geo/prompt-tags-action-dialog";
import { Table, type TableColumn } from "@/components/motion/table";
import { GEO_PROMPT_DETAIL_SURFACES } from "@/constants/geo-analytics";
import {
  GEO_PROMPT_DEFAULT_FILTERS,
  GEO_PROMPT_FILTER_SELECT_CLASS,
} from "@/constants/geo-prompts";
import { useGeoPromptsDb } from "@/lib/hooks/use-geo-db";
import { useGeoPromptIntentLabel } from "@/lib/hooks/use-geo-prompt-intent-label";
import { useGeoPromptSourceLabels } from "@/lib/hooks/use-geo-prompt-source-labels";
import type {
  GeoPromptIntentFilter,
  GeoPromptTableFilters,
  GeoPromptTableRow,
  PromptTagsDialogTarget,
  PromptsTableProps,
} from "@/types/geo";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
import { promptFiltersActive } from "@/utils/geo-prompt-filters";
import {
  buildPromptTableRows,
  promptPresenceSortValue,
} from "@/utils/geo-prompts";

const PROMPT_ACTIONS_WIDTH = "6rem";

function PromptRowActions({
  row,
  isPending,
  onToggle,
  onDelete,
}: {
  row: GeoPromptTableRow;
  isPending: boolean;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("geo.promptsTable");
  const tGeoShared = useTranslations("geo.shared");
  const stop = (event: { stopPropagation: () => void }) =>
    event.stopPropagation();
  const pauseSwitch = (
    <div onClick={stop} onPointerDown={stop}>
      <Switch
        aria-label={
          row.enabled
            ? t("pauseAria", { prompt: row.prompt })
            : t("enableAria", { prompt: row.prompt })
        }
        checked={row.enabled}
        disabled={isPending}
        onCheckedChange={(enabled) => {
          if (typeof enabled === "boolean") {
            onToggle(enabled);
          }
        }}
        size="sm"
      />
    </div>
  );

  return (
    <div className="flex items-center justify-end gap-1">
      {pauseSwitch}
      <Button
        aria-label={tGeoShared("removePrompt", { prompt: row.prompt })}
        className="group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:opacity-0"
        disabled={isPending}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        size="icon"
        variant="ghost"
      >
        <HugeiconsIcon icon={Delete02Icon} size={14} />
      </Button>
    </div>
  );
}

function PromptTableContextMenu({
  row,
  isPending,
  onOpenDetails,
  onEditTags,
  onToggle,
  onDelete,
}: {
  row: GeoPromptTableRow;
  isPending: boolean;
  onOpenDetails: () => void;
  onEditTags: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("geo.promptsTable");
  const tGeoShared = useTranslations("geo.shared");
  return (
    <>
      <ContextMenuItem onClick={onOpenDetails}>
        <HugeiconsIcon icon={ViewIcon} strokeWidth={2} />
        {tGeoShared("openDetails")}
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => copyTextToClipboard(row.prompt, t("copiedPrompt"))}
      >
        <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
        {tGeoShared("copyPrompt")}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        disabled={isPending || row.source === "auto"}
        onClick={onEditTags}
      >
        <HugeiconsIcon icon={Tag01Icon} strokeWidth={2} />
        {tGeoShared("editTags")}
      </ContextMenuItem>
      <ContextMenuItem disabled={isPending} onClick={onToggle}>
        <HugeiconsIcon
          icon={row.enabled ? PauseIcon : PlayIcon}
          strokeWidth={2}
        />
        {row.enabled ? t("pausePrompt") : t("enablePrompt")}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        disabled={isPending}
        onClick={onDelete}
        variant="destructive"
      >
        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
        {t("removePrompt")}
      </ContextMenuItem>
    </>
  );
}

export function PromptsTable({
  organizationId,
  prompts,
  results,
  isScanning = false,
  onAddPrompt,
  onImportCsv,
}: PromptsTableProps) {
  const t = useTranslations("geo.promptsTable");
  const sourceLabels = useGeoPromptSourceLabels();
  const tGeoShared = useTranslations("geo.shared");
  const tCommon2 = useTranslations("common");
  const intentLabel = useGeoPromptIntentLabel();
  const tCommon = useTranslations("common.actions");
  const tPages = useTranslations("geo.pages.shared");
  const intentFilterLabel = (value: GeoPromptIntentFilter) =>
    value === GEO_PROMPT_FILTER_ALL ? t("allIntents") : intentLabel(value);
  const promptRemoveDescription = (items: string[]) =>
    items.length > 1
      ? t("removeDescriptionMany")
      : t("removeDescriptionOne", { prompt: items[0] ?? "" });
  const {
    isLoading: promptsLoading,
    pendingPromptIds,
    togglePrompt,
    removePrompts,
    setPromptTags,
    addTagsToPrompts,
  } = useGeoPromptsDb(organizationId);
  const [search, setSearch] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true })
  );
  const [intent, setIntent] = useQueryState(
    "intent",
    parseAsStringLiteral(GEO_PROMPT_INTENT_FILTER_VALUES)
      .withDefault(GEO_PROMPT_FILTER_ALL)
      .withOptions({ clearOnDefault: true })
  );
  const [tag, setTag] = useQueryState(
    "tag",
    parseAsString
      .withDefault(GEO_PROMPT_FILTER_ALL)
      .withOptions({ clearOnDefault: true })
  );
  const [source, setSource] = useQueryState(
    "source",
    parseAsStringLiteral(GEO_PROMPT_SOURCE_FILTER_VALUES)
      .withDefault(GEO_PROMPT_FILTER_ALL)
      .withOptions({ clearOnDefault: true })
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<GeoPromptTableRow[]>([]);
  const [tagsTarget, setTagsTarget] = useState<PromptTagsDialogTarget | null>(
    null
  );
  const [detail, setDetail] = useState<GeoPromptTableRow | null>(null);

  const filters = useMemo<GeoPromptTableFilters>(
    () => ({ q: search, intent, tag, source }),
    [search, intent, tag, source]
  );
  const tagsInUse = useMemo(() => collectPromptTags(prompts), [prompts]);
  const activeTagFilterMissing =
    tag !== GEO_PROMPT_FILTER_ALL && !tagsInUse.includes(tag);
  const tagOptions = activeTagFilterMissing ? [tag, ...tagsInUse] : tagsInUse;

  const rows = useMemo(
    () => buildPromptTableRows(prompts, results, filters),
    [prompts, results, filters]
  );

  const selectedIdSet = new Set(selectedIds);
  const selectedRows = rows.filter((row) => selectedIdSet.has(row.id));

  const requestDelete = (targets: GeoPromptTableRow[]) => {
    if (targets.length === 0) {
      return;
    }
    setPendingDelete(targets);
    setDeleteOpen(true);
  };

  const applyTags = (tags: string[]) => {
    if (!tagsTarget) {
      return;
    }
    if (tagsTarget.mode === "edit") {
      const target = tagsTarget.rows[0];
      if (target) {
        setPromptTags(target.id, tags);
      }
      return;
    }
    const custom = tagsTarget.rows.filter((row) => row.source === "custom");
    if (custom.length < tagsTarget.rows.length) {
      toast.info(t("tagsCustomOnly"));
    }
    if (custom.length > 0 && tags.length > 0) {
      addTagsToPrompts(
        custom.map((row) => row.id),
        tags
      );
    }
  };

  const clearFilters = () => {
    setSearch(GEO_PROMPT_DEFAULT_FILTERS.q);
    setIntent(GEO_PROMPT_DEFAULT_FILTERS.intent);
    setTag(GEO_PROMPT_DEFAULT_FILTERS.tag);
    setSource(GEO_PROMPT_DEFAULT_FILTERS.source);
  };

  const noPromptsTracked = !promptsLoading && prompts.length === 0;
  const staleFilters = noPromptsTracked && promptFiltersActive(filters);
  // The empty state hides the filter bar, so filters left in the URL would
  // silently hide the next prompt someone adds.
  useEffect(() => {
    if (!staleFilters) {
      return;
    }
    void setSearch(GEO_PROMPT_DEFAULT_FILTERS.q);
    void setIntent(GEO_PROMPT_DEFAULT_FILTERS.intent);
    void setTag(GEO_PROMPT_DEFAULT_FILTERS.tag);
    void setSource(GEO_PROMPT_DEFAULT_FILTERS.source);
  }, [staleFilters, setSearch, setIntent, setTag, setSource]);

  let emptyState: ReactNode = (
    <Empty className="py-8 md:py-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={SearchIcon} />
        </EmptyMedia>
        <EmptyTitle className="text-foreground">{t("noMatches")}</EmptyTitle>
        <EmptyDescription>{t("noMatchesDescription")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={clearFilters} size="sm" variant="outline">
          {t("clearFilters")}
        </Button>
      </EmptyContent>
    </Empty>
  );
  if (prompts.length === 0) {
    emptyState = tGeoShared("scanningEngines");
  }

  const columns: TableColumn<GeoPromptTableRow>[] = [
    {
      key: "prompt",
      header: (
        <span className="inline-flex items-center gap-1.5">
          {tGeoShared("prompt")}
          <span className="text-muted-foreground font-normal tabular-nums">
            ({rows.length})
          </span>
        </span>
      ),
      sortable: true,
      width: "1fr",
      minWidth: "10rem",
      cell: (row) => (
        <button
          aria-label={tGeoShared("openDetailsPrompt", { prompt: row.prompt })}
          className="focus-visible:ring-ring flex min-h-8 w-full min-w-0 items-center rounded-sm text-left hover:underline focus-visible:ring-2"
          onClick={() => setDetail(row)}
          type="button"
        >
          <TruncateWithTooltip className="font-medium">
            {row.prompt}
          </TruncateWithTooltip>
        </button>
      ),
    },
    {
      key: "intent",
      header: tCommon2("labels.intent"),
      width: "8.5rem",
      minWidth: "8.5rem",
      sortable: true,
      cell: (row) => <PromptIntentBadge intent={row.intent} />,
      sortValue: (row) => intentLabel(row.intent),
    },
    {
      key: "presence",
      header: t("columns.presence"),
      width: "10rem",
      minWidth: "10rem",
      sortable: true,
      cell: (row) => <PromptPresenceBadge status={row.presence} />,
      sortValue: (row) => promptPresenceSortValue(row.presence),
    },
    {
      key: "engines",
      header: tGeoShared("engines"),
      width: "5.5rem",
      minWidth: "5.5rem",
      sortable: true,
      cell: (row) =>
        row.total === 0 ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          <span className="text-muted-foreground tabular-nums">
            {row.mentioned}/{row.total}
          </span>
        ),
      sortValue: (row) => (row.total === 0 ? -1 : row.mentioned / row.total),
    },
    {
      key: "actions",
      header: "",
      width: PROMPT_ACTIONS_WIDTH,
      minWidth: PROMPT_ACTIONS_WIDTH,
      align: "right",
      cell: (row) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(event) => event.stopPropagation()}
        >
          <PromptRowActions
            isPending={pendingPromptIds.has(row.id)}
            onDelete={() => requestDelete([row])}
            onToggle={(enabled) => togglePrompt(row.id, enabled)}
            row={row}
          />
        </div>
      ),
    },
  ];

  // Nothing tracked yet: filters and an empty table would only add noise.
  if (noPromptsTracked && !isScanning) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={BubbleChatQuestionIcon} />
          </EmptyMedia>
          <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
          <EmptyDescription>{t("emptyIdle")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={onAddPrompt} size="sm">
              <HugeiconsIcon icon={PlusSignIcon} size={14} />
              {tGeoShared("addPrompt")}
            </Button>
            <Button onClick={onImportCsv} size="sm" variant="outline">
              <HugeiconsIcon icon={Upload01Icon} size={14} />
              {tPages("importCsv")}
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full min-w-0 sm:w-72">
          <HugeiconsIcon
            className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
            icon={SearchIcon}
            size={15}
          />
          <Input
            aria-label={t("filterAria")}
            className="pl-9"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("filterPlaceholder")}
            value={search}
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Select
            onValueChange={(value) => {
              const next = GEO_PROMPT_INTENT_FILTER_VALUES.find(
                (option) => option === value
              );
              setIntent(next ?? GEO_PROMPT_FILTER_ALL);
            }}
            value={intent}
          >
            <SelectTrigger
              aria-label={t("filterByIntent")}
              className={GEO_PROMPT_FILTER_SELECT_CLASS}
            >
              <SelectValue>{intentFilterLabel(intent)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GEO_PROMPT_INTENT_FILTER_VALUES.map((option) => (
                <SelectItem key={option} value={option}>
                  {intentFilterLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tagOptions.length > 0 ? (
            <Select
              onValueChange={(value) => setTag(value ?? GEO_PROMPT_FILTER_ALL)}
              value={tag}
            >
              <SelectTrigger
                aria-label={t("filterByTag")}
                className={GEO_PROMPT_FILTER_SELECT_CLASS}
              >
                <SelectValue>
                  {tag === GEO_PROMPT_FILTER_ALL ? t("allTags") : tag}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GEO_PROMPT_FILTER_ALL}>
                  {t("allTags")}
                </SelectItem>
                {tagOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Select
            onValueChange={(value) => {
              const next = GEO_PROMPT_SOURCE_FILTER_VALUES.find(
                (option) => option === value
              );
              setSource(next ?? GEO_PROMPT_FILTER_ALL);
            }}
            value={source}
          >
            <SelectTrigger
              aria-label={tCommon2("labels.filterBySource")}
              className={GEO_PROMPT_FILTER_SELECT_CLASS}
            >
              <SelectValue>{sourceLabels[source]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GEO_PROMPT_SOURCE_FILTER_VALUES.map((option) => (
                <SelectItem key={option} value={option}>
                  {sourceLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {promptFiltersActive(filters) ? (
            <Button onClick={clearFilters} size="sm" variant="ghost">
              {tCommon("clear")}
            </Button>
          ) : null}
          {selectedRows.length > 0 && (
            <Button
              onClick={() =>
                setTagsTarget({ mode: "bulk", rows: selectedRows })
              }
              size="sm"
              variant="outline"
            >
              <HugeiconsIcon icon={Tag01Icon} size={14} />
              {t("addTagCount", { count: selectedRows.length })}
            </Button>
          )}
          {selectedRows.length > 0 && (
            <Button
              onClick={() => requestDelete(selectedRows)}
              size="sm"
              variant="outline"
            >
              <HugeiconsIcon icon={Delete02Icon} size={14} />
              {tGeoShared("removeCount", { count: selectedRows.length })}
            </Button>
          )}
        </div>
      </div>

      <Table
        className="rounded-2xl"
        columns={columns}
        data={rows}
        emptyState={emptyState}
        getRowId={(row) => row.id}
        height={PROMPTS_TABLE_HEIGHT}
        onRowClick={setDetail}
        onSelectionChange={setSelectedIds}
        renderRowContextMenu={(row) => (
          <PromptTableContextMenu
            isPending={pendingPromptIds.has(row.id)}
            onDelete={() => requestDelete([row])}
            onEditTags={() => setTagsTarget({ mode: "edit", rows: [row] })}
            onOpenDetails={() => setDetail(row)}
            onToggle={() => togglePrompt(row.id, !row.enabled)}
            row={row}
          />
        )}
        resizable
        rowHeight={PROMPTS_TABLE_ROW_HEIGHT}
        selectable
        selectedRowIds={selectedIds}
      />

      <GeoRemoveDialog
        description={promptRemoveDescription}
        isPending={false}
        items={pendingDelete.map((row) => row.prompt)}
        nouns={{ singular: t("nounSingular"), plural: t("nounPlural") }}
        title={t("removeTitle", { count: pendingDelete.length })}
        actionLabel={t("removeAction", { count: pendingDelete.length })}
        onConfirm={() => {
          removePrompts(pendingDelete.map((row) => row.id));
          setSelectedIds([]);
          setDeleteOpen(false);
        }}
        onOpenChange={(openDialog) => {
          setDeleteOpen(openDialog);
          if (!openDialog) {
            setPendingDelete([]);
          }
        }}
        open={deleteOpen}
      />
      <PromptTagsActionDialog
        target={tagsTarget}
        onConfirm={applyTags}
        onClose={() => setTagsTarget(null)}
        suggestions={tagsInUse}
      />
      <PromptDetailDialog
        isScanning={isScanning}
        onOpenChange={(openDialog) => {
          if (!openDialog) {
            setDetail(null);
          }
        }}
        open={detail !== null}
        organizationId={organizationId}
        row={detail}
        surface={GEO_PROMPT_DETAIL_SURFACES.PROMPTS_TABLE}
      />
    </div>
  );
}
