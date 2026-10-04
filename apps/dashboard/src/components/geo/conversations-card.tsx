"use client";

import {
  AiMagicIcon,
  Delete02Icon,
  MessageMultiple01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  PlayIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_MAX_SEQUENCES } from "@notra/geo-core/constants/geo";
import type { GeoPromptSequence } from "@notra/geo-core/types/geo";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@notra/ui/components/ui/empty";
import { Switch } from "@notra/ui/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { type ReactNode, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { ConversationBuilderDialog } from "@/components/geo/conversation-builder-dialog";
import { ConversationResultsDialog } from "@/components/geo/conversation-results-dialog";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import {
  useGeoRunSequence,
  useGeoSequencesGenerate,
} from "@/lib/hooks/use-geo";
import { useGeoSequencesDb } from "@/lib/hooks/use-geo-db";
import type {
  ConversationRowActionsProps,
  ConversationsCardProps,
} from "@/types/geo";
import { tableHeightFor } from "@/utils/table";

const CONVERSATION_TURNS_WIDTH = "6.5rem";
const CONVERSATION_ACTIONS_WIDTH = "10.5rem";

function ConversationRowActions({
  sequence,
  isRunning,
  isPending,
  isRunPending,
  onRun,
  onToggle,
  onEdit,
  onDelete,
}: ConversationRowActionsProps) {
  const t = useTranslations("geo.conversationsCard");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const stop = (event: { stopPropagation: () => void }) =>
    event.stopPropagation();
  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={t("runNamed", { name: sequence.name })}
              disabled={isRunPending}
              loading={isRunning}
              onClick={(event) => {
                event.stopPropagation();
                onRun();
              }}
              size="sm"
              variant="ghost"
            />
          }
        >
          <HugeiconsIcon icon={PlayIcon} size={14} />
          {t("run")}
        </TooltipTrigger>
        <TooltipContent>
          {isRunning ? tGeoShared("playingAgainstTheEngines") : t("runThis")}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Switch
              aria-label={
                sequence.enabled
                  ? tCommon2("labels.pauseName", { name: sequence.name })
                  : tCommon2("labels.enableName", { name: sequence.name })
              }
              checked={sequence.enabled}
              className="mx-1.5"
              disabled={isPending}
              onCheckedChange={onToggle}
              onClick={stop}
              onPointerDown={stop}
              size="sm"
            />
          }
        />
        <TooltipContent>
          {sequence.enabled ? t("includedInScans") : t("pausedInScans")}
        </TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={t("moreActions", { name: sequence.name })}
              onClick={stop}
              onPointerDown={stop}
              size="icon-sm"
              variant="ghost"
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-40" onClick={stop}>
          <DropdownMenuItem onClick={onEdit}>
            <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
            {tCommon("edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isPending}
            onClick={onDelete}
            variant="destructive"
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            {tCommon("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function renderActions(actions: ReactNode, container?: HTMLElement | null) {
  if (container) {
    return createPortal(actions, container);
  }
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {actions}
    </div>
  );
}

export function ConversationsCard({
  organizationId,
  actionsContainer,
}: ConversationsCardProps) {
  const {
    sequences,
    isLoading,
    pendingSequenceIds,
    updateSequence,
    removeSequence,
  } = useGeoSequencesDb(organizationId);
  const runSequence = useGeoRunSequence(organizationId);
  const t = useTranslations("geo.conversationsCard");
  const tCommon3 = useTranslations("common");
  const tGeoShared = useTranslations("geo.shared");
  const generateSequences = useGeoSequencesGenerate(organizationId);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<GeoPromptSequence | null>(null);
  const [viewing, setViewing] = useState<GeoPromptSequence | null>(null);

  const runningSequenceId = runSequence.isPending
    ? runSequence.variables
    : null;

  const columns = useMemo<TableColumn<GeoPromptSequence>[]>(
    () => [
      {
        key: "name",
        header: tGeoShared("conversation"),
        hint: t("intro"),
        sortable: true,
        width: "1fr",
        minWidth: "14rem",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm leading-5 font-medium">{row.name}</p>
            {row.steps[0] ? (
              <p className="text-muted-foreground truncate text-xs leading-4">
                {row.steps[0]}
              </p>
            ) : null}
          </div>
        ),
        sortValue: (row) => row.name,
      },
      {
        key: "turns",
        header: tGeoShared("turns"),
        width: CONVERSATION_TURNS_WIDTH,
        minWidth: CONVERSATION_TURNS_WIDTH,
        sortable: true,
        cell: (row) => (
          <span className="text-muted-foreground text-sm tabular-nums">
            {t("turnsCount", { count: row.steps.length })}
          </span>
        ),
        sortValue: (row) => row.steps.length,
      },
      {
        key: "actions",
        header: "",
        width: CONVERSATION_ACTIONS_WIDTH,
        minWidth: CONVERSATION_ACTIONS_WIDTH,
        align: "right",
        cell: (row) => (
          <ConversationRowActions
            isPending={pendingSequenceIds.has(row.id)}
            isRunning={runningSequenceId === row.id}
            isRunPending={runSequence.isPending}
            onDelete={() => removeSequence(row.id)}
            onEdit={() => {
              setEditing(row);
              setBuilderOpen(true);
            }}
            onRun={() => runSequence.mutate(row.id)}
            onToggle={(enabled) => updateSequence(row.id, { enabled })}
            sequence={row}
          />
        ),
      },
    ],
    [
      pendingSequenceIds,
      removeSequence,
      runSequence,
      runningSequenceId,
      t,
      tGeoShared,
      updateSequence,
    ]
  );

  const canAdd = !isLoading && sequences.length < GEO_MAX_SEQUENCES;
  const openBuilder = () => {
    setEditing(null);
    setBuilderOpen(true);
  };
  const generateButton = (
    <Button
      disabled={generateSequences.isPending}
      onClick={() => generateSequences.mutate()}
      size="sm"
      variant={sequences.length === 0 ? "default" : "ghost"}
    >
      {generateSequences.isPending ? (
        <StatusSpinner />
      ) : (
        <HugeiconsIcon icon={AiMagicIcon} size={14} />
      )}
      {generateSequences.isPending
        ? tCommon3("labels.generating")
        : t("generate")}
    </Button>
  );
  const newButton = (
    <Button
      disabled={!canAdd}
      onClick={openBuilder}
      size="sm"
      variant="outline"
    >
      <HugeiconsIcon icon={PlusSignIcon} size={14} />
      {tGeoShared("newConversation")}
    </Button>
  );
  const showEmpty = !isLoading && sequences.length === 0;
  const actions = (
    <>
      {canAdd ? generateButton : null}
      {newButton}
    </>
  );

  return (
    <section aria-label={tGeoShared("conversations")} className="space-y-3">
      {showEmpty ? null : renderActions(actions, actionsContainer)}

      {showEmpty ? (
        <Empty aria-busy={generateSequences.isPending}>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={MessageMultiple01Icon} />
            </EmptyMedia>
            <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
            <EmptyDescription>
              {generateSequences.isPending ? t("emptyGenerating") : t("empty")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-2">
              {generateButton}
              {newButton}
            </div>
          </EmptyContent>
        </Empty>
      ) : (
        <DataTable
          columns={columns}
          data={sequences}
          defaultSort={{ key: "name", direction: "asc" }}
          getRowId={(row) => row.id}
          height={tableHeightFor(
            Math.max(sequences.length, 2),
            TABLE_ROW_HEIGHT
          )}
          loading={isLoading}
          onRowClick={setViewing}
          resizable
          rowHeight={TABLE_ROW_HEIGHT}
        />
      )}

      <ConversationBuilderDialog
        key={editing?.id ?? "new"}
        onOpenChange={(next) => {
          setBuilderOpen(next);
          if (!next) {
            setEditing(null);
          }
        }}
        open={builderOpen}
        organizationId={organizationId}
        sequence={editing}
      />
      <ConversationResultsDialog
        isRunning={viewing !== null && runningSequenceId === viewing.id}
        onOpenChange={(next) => {
          if (!next) {
            setViewing(null);
          }
        }}
        onRun={() => {
          if (viewing && !runSequence.isPending) {
            runSequence.mutate(viewing.id);
          }
        }}
        open={viewing !== null}
        organizationId={organizationId}
        sequence={viewing}
      />
    </section>
  );
}
