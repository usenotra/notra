"use client";

import {
  Copy01Icon,
  Delete02Icon,
  PauseIcon,
  PlayIcon,
  SearchIcon,
  Tag01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_PROMPT_TAGS_CUSTOM_ONLY_TOAST,
  PROMPTS_TABLE_HEIGHT,
  PROMPTS_TABLE_ROW_HEIGHT,
} from "@notra/geo-core/constants/geo";
import { geoPromptIntentLabel } from "@notra/geo-core/utils/geo-prompt-intent";
import { collectPromptTags } from "@notra/geo-core/utils/geo-prompt-tags";
import { geoScanEmptyMessage } from "@notra/geo-core/utils/geo-scan";
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
import { Input } from "@notra/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Switch } from "@notra/ui/components/ui/switch";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { GeoRemoveDialog } from "@/components/geo/geo-remove-dialog";
import {
  PromptIntentBadge,
  PromptPresenceBadge,
} from "@/components/geo/prompt-badges";
import { PromptDetailDialog } from "@/components/geo/prompt-detail-dialog";
import { PromptSavedViewsMenu } from "@/components/geo/prompt-saved-views-menu";
import { PromptTagsActionDialog } from "@/components/geo/prompt-tags-action-dialog";
import { Table, type TableColumn } from "@/components/motion/table";
import { GEO_PROMPT_DETAIL_SURFACES } from "@/constants/geo-analytics";
import {
  GEO_PROMPT_DEFAULT_FILTERS,
  GEO_PROMPT_FILTER_SELECT_CLASS,
  GEO_PROMPT_INTENT_FILTER_OPTIONS,
  GEO_PROMPT_SOURCE_FILTER_OPTIONS,
  GEO_PROMPT_TAG_FILTER_ALL_LABEL,
  GEO_PROMPT_TAGS_COPY,
  GEO_PROMPT_VIEWS_COPY,
} from "@/constants/geo-prompts";
import { useGeoPromptsDb } from "@/lib/hooks/use-geo-db";
import { useGeoSavedViews } from "@/lib/hooks/use-geo-saved-views";
import type {
  GeoPromptSavedView,
  GeoPromptTableFilters,
  GeoPromptTableRow,
  PromptTagsDialogTarget,
  PromptsTableProps,
} from "@/types/geo";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
import { promptFiltersActive } from "@/utils/geo-prompt-views";
import {
  buildPromptTableRows,
  promptPresenceSortValue,
} from "@/utils/geo-prompts";

const PROMPT_NOUNS = { singular: "prompt", plural: "prompts" } as const;
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
  const stop = (event: { stopPropagation: () => void }) =>
    event.stopPropagation();
  const pauseSwitch = (
    <div onClick={stop} onPointerDown={stop}>
      <Switch
        aria-label={
          row.enabled ? `Pause ${row.prompt}` : `Enable ${row.prompt}`
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
        aria-label={`Remove ${row.prompt}`}
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
  return (
    <>
      <ContextMenuItem onClick={onOpenDetails}>
        <HugeiconsIcon icon={ViewIcon} strokeWidth={2} />
        Open details
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => copyTextToClipboard(row.prompt, "Copied prompt")}
      >
        <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
        Copy prompt
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        disabled={isPending || row.source === "auto"}
        onClick={onEditTags}
      >
        <HugeiconsIcon icon={Tag01Icon} strokeWidth={2} />
        Edit tags
      </ContextMenuItem>
      <ContextMenuItem disabled={isPending} onClick={onToggle}>
        <HugeiconsIcon
          icon={row.enabled ? PauseIcon : PlayIcon}
          strokeWidth={2}
        />
        {row.enabled ? "Pause prompt" : "Enable prompt"}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        disabled={isPending}
        onClick={onDelete}
        variant="destructive"
      >
        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
        Remove prompt
      </ContextMenuItem>
    </>
  );
}

function promptRemoveDescription(items: string[]): string {
  if (items.length > 1) {
    return "These questions will no longer be asked in GEO scans. Historical answers stay in your results.";
  }
  return `"${items[0]}" will no longer be asked in GEO scans. Historical answers stay in your results.`;
}

export function PromptsTable({
  organizationId,
  prompts,
  results,
  isScanning = false,
}: PromptsTableProps) {
  const {
    pendingPromptIds,
    togglePrompt,
    removePrompts,
    setPromptTags,
    addTagsToPrompts,
  } = useGeoPromptsDb(organizationId);
  const { views, saveView, removeView } = useGeoSavedViews(organizationId);
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

  const applyView = (view: GeoPromptSavedView) => {
    setSearch(view.query.q);
    setIntent(view.query.intent);
    setTag(view.query.tag);
    setSource(view.query.source);
    toast.success(`${GEO_PROMPT_VIEWS_COPY.applied}: ${view.name}`);
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
      toast.info(GEO_PROMPT_TAGS_CUSTOM_ONLY_TOAST);
    }
    if (custom.length > 0 && tags.length > 0) {
      addTagsToPrompts(
        custom.map((row) => row.id),
        tags
      );
    }
  };

  const columns: TableColumn<GeoPromptTableRow>[] = [
    {
      key: "prompt",
      header: (
        <span className="inline-flex items-center gap-1.5">
          Prompt
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
          aria-label={`Open details: ${row.prompt}`}
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
      header: GEO_PROMPT_TAGS_COPY.intentColumn,
      width: "8.5rem",
      minWidth: "8.5rem",
      sortable: true,
      cell: (row) => <PromptIntentBadge intent={row.intent} />,
      sortValue: (row) => geoPromptIntentLabel(row.intent),
    },
    {
      key: "presence",
      header: "Presence",
      width: "10rem",
      minWidth: "10rem",
      sortable: true,
      cell: (row) => <PromptPresenceBadge status={row.presence} />,
      sortValue: (row) => promptPresenceSortValue(row.presence),
    },
    {
      key: "engines",
      header: "Engines",
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
            aria-label="Filter prompts"
            className="pl-9"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter prompts..."
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
              aria-label="Filter by intent"
              className={GEO_PROMPT_FILTER_SELECT_CLASS}
            >
              <SelectValue>
                {GEO_PROMPT_INTENT_FILTER_OPTIONS.find(
                  (option) => option.value === intent
                )?.label ?? GEO_PROMPT_INTENT_FILTER_OPTIONS[0]?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GEO_PROMPT_INTENT_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
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
                aria-label="Filter by tag"
                className={GEO_PROMPT_FILTER_SELECT_CLASS}
              >
                <SelectValue>
                  {tag === GEO_PROMPT_FILTER_ALL
                    ? GEO_PROMPT_TAG_FILTER_ALL_LABEL
                    : tag}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GEO_PROMPT_FILTER_ALL}>
                  {GEO_PROMPT_TAG_FILTER_ALL_LABEL}
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
              aria-label="Filter by source"
              className={GEO_PROMPT_FILTER_SELECT_CLASS}
            >
              <SelectValue>
                {GEO_PROMPT_SOURCE_FILTER_OPTIONS.find(
                  (option) => option.value === source
                )?.label ?? GEO_PROMPT_SOURCE_FILTER_OPTIONS[0]?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GEO_PROMPT_SOURCE_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PromptSavedViewsMenu
            filters={filters}
            onApply={applyView}
            onRemove={(viewId) => {
              removeView(viewId);
              toast.success(GEO_PROMPT_VIEWS_COPY.removedToast);
            }}
            onSave={(name) => {
              saveView(name, filters);
              toast.success(GEO_PROMPT_VIEWS_COPY.savedToast);
            }}
            views={views}
          />
          {promptFiltersActive(filters) ? (
            <Button
              onClick={() => {
                setSearch(GEO_PROMPT_DEFAULT_FILTERS.q);
                setIntent(GEO_PROMPT_DEFAULT_FILTERS.intent);
                setTag(GEO_PROMPT_DEFAULT_FILTERS.tag);
                setSource(GEO_PROMPT_DEFAULT_FILTERS.source);
              }}
              size="sm"
              variant="ghost"
            >
              Clear
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
              {GEO_PROMPT_TAGS_COPY.bulk} ({selectedRows.length})
            </Button>
          )}
          {selectedRows.length > 0 && (
            <Button
              onClick={() => requestDelete(selectedRows)}
              size="sm"
              variant="outline"
            >
              <HugeiconsIcon icon={Delete02Icon} size={14} />
              Remove ({selectedRows.length})
            </Button>
          )}
        </div>
      </div>

      <Table
        className="rounded-2xl"
        columns={columns}
        data={rows}
        emptyState={
          prompts.length === 0
            ? geoScanEmptyMessage(
                isScanning,
                "Add a prompt to start tracking how AI engines answer"
              )
            : "No prompts match these filters"
        }
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
        nouns={PROMPT_NOUNS}
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
