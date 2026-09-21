"use client";

import {
  AiMagicIcon,
  Delete02Icon,
  Loading03Icon,
  PencilEdit02Icon,
  PlayIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_MAX_SEQUENCES } from "@notra/geo-core/constants/geo";
import type { GeoPromptSequence } from "@notra/geo-core/types/geo";
import { Switch } from "@notra/ui/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useMemo, useState } from "react";

import { Button } from "@/components/button";
import { ConversationBuilderDialog } from "@/components/geo/conversation-builder-dialog";
import { ConversationResultsDialog } from "@/components/geo/conversation-results-dialog";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import {
  useGeoRunSequence,
  useGeoSequencesGenerate,
} from "@/lib/hooks/use-geo";
import { useGeoSequencesDb } from "@/lib/hooks/use-geo-db";
import type { ConversationsCardProps } from "@/types/geo";
import { tableHeightFor } from "@/utils/table";

const CONVERSATION_TURNS_WIDTH = "4.5rem";
const CONVERSATION_ACTIONS_WIDTH = "11.25rem";

function ConversationRowActions({
  sequence,
  isRunning,
  isPending,
  isRunPending,
  onRun,
  onToggle,
  onEdit,
  onDelete,
}: {
  sequence: GeoPromptSequence;
  isRunning: boolean;
  isPending: boolean;
  isRunPending: boolean;
  onRun: () => void;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={`Run ${sequence.name} now`}
              disabled={isRunPending}
              onClick={(event) => {
                event.stopPropagation();
                onRun();
              }}
              size="icon"
              variant="ghost"
            />
          }
        >
          <HugeiconsIcon
            className={isRunning ? "animate-spin" : undefined}
            icon={isRunning ? Loading03Icon : PlayIcon}
            size={14}
          />
        </TooltipTrigger>
        <TooltipContent>
          {isRunning
            ? "Playing against the engines…"
            : "Run this conversation now"}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Switch
              aria-label={
                sequence.enabled
                  ? `Pause ${sequence.name}`
                  : `Enable ${sequence.name}`
              }
              checked={sequence.enabled}
              className="mx-2"
              disabled={isPending}
              onCheckedChange={onToggle}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              size="sm"
            />
          }
        />
        <TooltipContent>
          {sequence.enabled ? "Included in scans" : "Paused — skipped in scans"}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={`Edit ${sequence.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              size="icon"
              variant="ghost"
            />
          }
        >
          <HugeiconsIcon icon={PencilEdit02Icon} size={14} />
        </TooltipTrigger>
        <TooltipContent>Edit</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={`Delete ${sequence.name}`}
              disabled={isPending}
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              size="icon"
              variant="ghost"
            />
          }
        >
          <HugeiconsIcon icon={Delete02Icon} size={14} />
        </TooltipTrigger>
        <TooltipContent>Delete</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function ConversationsCard({ organizationId }: ConversationsCardProps) {
  const { sequences, pendingSequenceIds, updateSequence, removeSequence } =
    useGeoSequencesDb(organizationId);
  const runSequence = useGeoRunSequence(organizationId);
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
        header: (
          <span className="inline-flex items-center gap-1.5">
            Conversation
            <span className="text-muted-foreground font-normal tabular-nums">
              ({sequences.length})
            </span>
          </span>
        ),
        sortable: true,
        width: "1fr",
        cell: (row) => (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="block w-full min-w-0 truncate font-medium">
                  {row.name}
                </span>
              }
            />
            <TooltipContent className="max-w-sm">{row.name}</TooltipContent>
          </Tooltip>
        ),
        sortValue: (row) => row.name,
      },
      {
        key: "turns",
        header: "Turns",
        width: CONVERSATION_TURNS_WIDTH,
        minWidth: CONVERSATION_TURNS_WIDTH,
        sortable: true,
        align: "right",
        cell: (row) => (
          <span className="text-muted-foreground tabular-nums">
            {row.steps.length}
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
      sequences.length,
      updateSequence,
    ]
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Conversations</h2>
          <p className="text-muted-foreground text-sm">
            Multi-turn questions where buying decisions happen
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={
              generateSequences.isPending ||
              sequences.length >= GEO_MAX_SEQUENCES
            }
            onClick={() => generateSequences.mutate()}
            size="sm"
            variant="ghost"
          >
            {generateSequences.isPending ? (
              <StatusSpinner />
            ) : (
              <HugeiconsIcon icon={AiMagicIcon} size={14} />
            )}
            {generateSequences.isPending ? "Generating…" : "Generate"}
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setBuilderOpen(true);
            }}
            size="sm"
            variant="outline"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={14} />
            New Conversation
          </Button>
        </div>
      </div>

      <Table
        className="rounded-2xl"
        columns={columns}
        data={sequences}
        defaultSort={{ key: "name", direction: "asc" }}
        emptyState={
          generateSequences.isPending
            ? "Writing conversations for your buyers…"
            : "Track an opening question plus the follow-ups that close the deal, or generate a few to start"
        }
        getRowId={(row) => row.id}
        height={tableHeightFor(Math.max(sequences.length, 2))}
        onRowClick={setViewing}
        resizable
        rowHeight={TABLE_ROW_HEIGHT}
      />

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
