"use client";

import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_PERSONA_MAX_TURNS } from "@notra/geo-core/constants/geo-personas";
import type { GeoPersona } from "@notra/geo-core/types/geo-personas";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Switch } from "@notra/ui/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useMutationState } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Button } from "@/components/button";
import { GeoRemoveDialog } from "@/components/geo/geo-remove-dialog";
import { PersonaAvatar } from "@/components/geo/persona-avatar";
import { PersonaDetailDialog } from "@/components/geo/persona-detail-dialog";
import { Table, type TableColumn } from "@/components/motion/table";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import {
  GEO_PERSONAS_ACTIONS_COLUMN_WIDTH,
  GEO_PERSONAS_MEMORIES_COLUMN_WIDTH,
  GEO_PERSONAS_TURNS_COLUMN_WIDTH,
} from "@/constants/geo-personas";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  geoPersonaUpdateMutationKey,
  useGeoPersonaDelete,
  useGeoPersonaUpdate,
} from "@/lib/hooks/use-geo-personas";
import type { GeoPersonaUpdateInput } from "@/types/geo-personas";
import type {
  PersonaRowActionsProps,
  PersonasTableProps,
} from "@/types/geo-personas-ui";
import { tableHeightFor } from "@/utils/table";

const MIN_TABLE_ROWS = 3;

function PersonaRowActions({
  persona,
  isPending,
  onToggle,
  onDelete,
}: PersonaRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger
          render={
            <Switch
              aria-label={
                persona.enabled
                  ? `Pause ${persona.name}`
                  : `Include ${persona.name} in scans`
              }
              checked={persona.enabled}
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
          {persona.enabled ? "Included in scans" : "Paused — skipped in scans"}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={`Delete ${persona.name}`}
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

export function PersonasTable({
  organizationId,
  personas,
}: PersonasTableProps) {
  const { projectId } = useGeoProjectScope();
  const updatePersona = useGeoPersonaUpdate(organizationId);
  const deletePersona = useGeoPersonaDelete(organizationId);
  const [viewing, setViewing] = useState<GeoPersona | null>(null);
  const [removing, setRemoving] = useState<GeoPersona | null>(null);

  // Every in-flight toggle, not just the latest: a row must stay locked until
  // its own request settles, or a second toggle could flip it back.
  const pendingPersonaIds = useMutationState({
    filters: {
      mutationKey: geoPersonaUpdateMutationKey(organizationId, projectId),
      status: "pending",
    },
    select: (mutation) =>
      (mutation.state.variables as GeoPersonaUpdateInput | undefined)
        ?.personaId ?? null,
  });
  const deletingPersonaId = deletePersona.isPending
    ? deletePersona.variables
    : null;

  const columns = useMemo<TableColumn<GeoPersona>[]>(
    () => [
      {
        key: "name",
        header: (
          <span className="inline-flex items-center gap-1.5">
            Persona
            <span className="text-muted-foreground font-normal tabular-nums">
              ({personas.length})
            </span>
          </span>
        ),
        sortable: true,
        width: "1fr",
        cell: (row) => (
          <span className="flex min-w-0 items-center gap-3">
            <PersonaAvatar persona={row} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm leading-snug font-medium">
                {row.name}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {row.role} · {row.company}
              </span>
            </span>
          </span>
        ),
        sortValue: (row) => row.name,
      },
      {
        key: "memories",
        header: "Memories",
        width: GEO_PERSONAS_MEMORIES_COLUMN_WIDTH,
        minWidth: GEO_PERSONAS_MEMORIES_COLUMN_WIDTH,
        sortable: true,
        align: "right",
        cell: (row) => (
          <span className="text-muted-foreground tabular-nums">
            {row.memories.length}
          </span>
        ),
        sortValue: (row) => row.memories.length,
      },
      {
        key: "turns",
        header: "Turns",
        width: GEO_PERSONAS_TURNS_COLUMN_WIDTH,
        minWidth: GEO_PERSONAS_TURNS_COLUMN_WIDTH,
        align: "right",
        cell: () => (
          <span className="text-muted-foreground tabular-nums">
            {GEO_PERSONA_MAX_TURNS}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        width: GEO_PERSONAS_ACTIONS_COLUMN_WIDTH,
        minWidth: GEO_PERSONAS_ACTIONS_COLUMN_WIDTH,
        align: "right",
        cell: (row) => (
          <PersonaRowActions
            isPending={
              pendingPersonaIds.includes(row.id) || deletingPersonaId === row.id
            }
            onDelete={() => setRemoving(row)}
            onToggle={(enabled) =>
              updatePersona.mutate({ personaId: row.id, enabled })
            }
            persona={row}
          />
        ),
      },
    ],
    [deletingPersonaId, pendingPersonaIds, personas.length, updatePersona]
  );

  return (
    <section className="space-y-3">
      <Table
        className="rounded-2xl"
        columns={columns}
        data={personas}
        defaultSort={{ key: "name", direction: "asc" }}
        emptyState="No personas yet — generate a set to have them research your category during scans"
        getRowId={(row) => row.id}
        height={tableHeightFor(Math.max(personas.length, MIN_TABLE_ROWS))}
        onRowClick={(row) => {
          trackEvent(POSTHOG_EVENTS.GEO_PERSONA_DETAIL_OPENED, {
            personaId: row.id,
          });
          setViewing(row);
        }}
        resizable
        rowHeight={TABLE_ROW_HEIGHT}
      />

      <PersonaDetailDialog
        onOpenChange={(next) => {
          if (!next) {
            setViewing(null);
          }
        }}
        open={viewing !== null}
        organizationId={organizationId}
        persona={viewing}
      />
      <GeoRemoveDialog
        description="Their memories and past conversations are removed with them. Scans will stop running this persona."
        isPending={deletePersona.isPending}
        items={removing ? [removing.name] : []}
        nouns={{ singular: "persona", plural: "personas" }}
        onConfirm={() => {
          if (!removing) {
            return;
          }
          deletePersona.mutate(removing.id, {
            onSettled: () => setRemoving(null),
          });
        }}
        onOpenChange={(next) => {
          if (!next) {
            setRemoving(null);
          }
        }}
        open={removing !== null}
      />
    </section>
  );
}
