"use client";

import { GEO_PERSONA_MAX_TURNS } from "@notra/geo-core/constants/geo-personas";
import type {
  GeoPersona,
  GeoPersonaUpdateInput,
} from "@notra/geo-core/types/geo-personas";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useMutationState } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { GeoRemoveDialog } from "@/components/geo/geo-remove-dialog";
import { PersonaAvatar } from "@/components/geo/persona-avatar";
import { PersonaDetailDialog } from "@/components/geo/persona-detail-dialog";
import {
  PersonaTableContextMenu,
  PersonaTableRowActions,
} from "@/components/geo/persona-table-actions";
import { Table, type TableColumn } from "@/components/motion/table";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import {
  GEO_PERSONAS_ACTIONS_COLUMN_WIDTH,
  GEO_PERSONAS_MEMORIES_COLUMN_WIDTH,
  GEO_PERSONAS_MIN_TABLE_ROWS,
  GEO_PERSONAS_TURNS_COLUMN_WIDTH,
} from "@/constants/geo-personas";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  useGeoPersonaDelete,
  useGeoPersonaRun,
  useGeoPersonasGenerate,
  useGeoPersonaUpdate,
} from "@/lib/hooks/use-geo-personas";
import type { PersonaTableProps } from "@/types/geo-personas-ui";
import { geoPersonaUpdateMutationKey } from "@/utils/geo-persona-queries";
import { tableHeightFor } from "@/utils/table";

export function PersonasTable({
  organizationId,
  personas,
  isAddingPersona,
  openPersonaId,
  onAutoOpenClose,
}: PersonaTableProps) {
  const { projectId } = useGeoProjectScope();
  const deletePersona = useGeoPersonaDelete(organizationId);
  const updatePersona = useGeoPersonaUpdate(organizationId);
  const generatePersona = useGeoPersonasGenerate(organizationId);
  const runPersona = useGeoPersonaRun(organizationId);
  const generationPending = generatePersona.isPending;
  const generatingPersonaId = generatePersona.generatingPersonaId;
  const regeneratePersona = generatePersona.mutate;
  const [viewing, setViewing] = useState<GeoPersona | null>(null);
  const [removing, setRemoving] = useState<GeoPersona | null>(null);

  // Prevent deleting a persona while its profile is being saved.
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
  const autoOpenPersona =
    personas.find((persona) => persona.id === openPersonaId) ?? null;
  const displayedPersona = autoOpenPersona ?? viewing;

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
                {generationPending && generatingPersonaId === row.id
                  ? "Regenerating…"
                  : `${row.role} · ${row.company}`}
              </span>
            </span>
          </span>
        ),
        sortValue: (row) => row.name,
      },
      {
        key: "memories",
        header: (
          <Tooltip>
            <TooltipTrigger render={<span className="cursor-help" />}>
              Memories
            </TooltipTrigger>
            <TooltipContent>
              Background facts and preferences this persona uses in
              conversations
            </TooltipContent>
          </Tooltip>
        ),
        width: GEO_PERSONAS_MEMORIES_COLUMN_WIDTH,
        minWidth: GEO_PERSONAS_MEMORIES_COLUMN_WIDTH,
        sortable: true,
        align: "center",
        cell: (row) => (
          <span className="text-muted-foreground tabular-nums">
            {row.memories.length}
          </span>
        ),
        sortValue: (row) => row.memories.length,
      },
      {
        key: "turns",
        header: (
          <Tooltip>
            <TooltipTrigger
              render={<button className="cursor-help" type="button" />}
            >
              Max. messages
            </TooltipTrigger>
            <TooltipContent>
              Maximum messages this persona asks each AI engine per scan, not
              completed activity
            </TooltipContent>
          </Tooltip>
        ),
        width: GEO_PERSONAS_TURNS_COLUMN_WIDTH,
        minWidth: GEO_PERSONAS_TURNS_COLUMN_WIDTH,
        align: "center",
        cell: () => (
          <span className="text-muted-foreground tabular-nums">
            {GEO_PERSONA_MAX_TURNS}
          </span>
        ),
      },
      {
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        width: GEO_PERSONAS_ACTIONS_COLUMN_WIDTH,
        minWidth: GEO_PERSONAS_ACTIONS_COLUMN_WIDTH,
        align: "right",
        cell: (row) => (
          <PersonaTableRowActions
            disabled={
              pendingPersonaIds.includes(row.id) ||
              generationPending ||
              deletingPersonaId !== null
            }
            onDelete={setRemoving}
            onRegenerate={(personaId) => regeneratePersona({ personaId })}
            persona={row}
          />
        ),
      },
    ],
    [
      deletingPersonaId,
      pendingPersonaIds,
      personas.length,
      generationPending,
      generatingPersonaId,
      regeneratePersona,
    ]
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
        height={tableHeightFor(
          Math.max(
            personas.length + (isAddingPersona ? 1 : 0),
            GEO_PERSONAS_MIN_TABLE_ROWS
          )
        )}
        loading={isAddingPersona}
        onRowClick={(row) => {
          trackEvent(POSTHOG_EVENTS.GEO_PERSONA_DETAIL_OPENED, {
            personaId: row.id,
          });
          setViewing(row);
        }}
        resizable
        renderRowContextMenu={(row) => (
          <PersonaTableContextMenu
            mutationDisabled={
              generationPending ||
              deletePersona.isPending ||
              pendingPersonaIds.includes(row.id)
            }
            onDelete={setRemoving}
            onRegenerate={(personaId) => regeneratePersona({ personaId })}
            onRun={runPersona.mutate}
            onToggle={(persona) =>
              updatePersona.mutate({
                personaId: persona.id,
                enabled: !persona.enabled,
              })
            }
            onView={(persona) => {
              trackEvent(POSTHOG_EVENTS.GEO_PERSONA_DETAIL_OPENED, {
                personaId: persona.id,
              });
              setViewing(persona);
            }}
            persona={row}
            scanDisabled={
              !row.enabled ||
              runPersona.isPending ||
              generationPending ||
              deletePersona.isPending ||
              pendingPersonaIds.includes(row.id)
            }
          />
        )}
        rowHeight={TABLE_ROW_HEIGHT}
        skeletonRows={1}
      />

      <PersonaDetailDialog
        onOpenChange={(next) => {
          if (!next) {
            setViewing(null);
            if (autoOpenPersona) {
              onAutoOpenClose();
            }
          }
        }}
        open={displayedPersona !== null}
        organizationId={organizationId}
        persona={
          personas.find((persona) => persona.id === displayedPersona?.id) ??
          displayedPersona
        }
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
