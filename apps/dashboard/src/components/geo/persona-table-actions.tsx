"use client";

import {
  Archive02Icon,
  ArchiveRestoreIcon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_PERSONA_MAX_COUNT } from "@notra/geo-core/constants/geo-personas";
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from "@notra/ui/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";

import { Button } from "@/components/button";
import type {
  PersonaTableContextMenuProps,
  PersonaTableRowActionsProps,
} from "@/types/geo-personas-ui";

export function PersonaTableRowActions({
  persona,
  disabled,
  onDelete,
  onRegenerate,
  onRestore,
  restoreDisabled,
}: PersonaTableRowActionsProps) {
  if (persona.archivedAt) {
    const reactivateDisabled = disabled || restoreDisabled;
    let tooltip = "Reactivate persona";
    if (restoreDisabled) {
      tooltip = `You can have up to ${GEO_PERSONA_MAX_COUNT} active personas. Archive one before reactivating this one.`;
    } else if (disabled) {
      tooltip = "Wait for the current persona action to finish.";
    }
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={`Reactivate ${persona.name}`}
              disabled={reactivateDisabled}
              focusableWhenDisabled
              onClick={(event) => {
                event.stopPropagation();
                if (!reactivateDisabled) {
                  onRestore(persona.id);
                }
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon icon={ArchiveRestoreIcon} size={16} />
            </Button>
          }
        />
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={`Regenerate ${persona.name}`}
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation();
                onRegenerate(persona.id);
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon icon={RefreshIcon} size={16} />
            </Button>
          }
        />
        <TooltipContent>Regenerate persona</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={`Archive ${persona.name}`}
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation();
                onDelete(persona);
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon icon={Archive02Icon} size={16} />
            </Button>
          }
        />
        <TooltipContent>Archive persona</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function PersonaTableContextMenu({
  persona,
  mutationDisabled,
  scanDisabled,
  onDelete,
  onRegenerate,
  onRestore,
  onRun,
  onToggle,
  onView,
  restoreDisabled,
}: PersonaTableContextMenuProps) {
  if (persona.archivedAt) {
    return (
      <ContextMenuItem
        disabled={mutationDisabled || restoreDisabled}
        onClick={() => onRestore(persona.id)}
      >
        <HugeiconsIcon icon={ArchiveRestoreIcon} />
        Reactivate persona
      </ContextMenuItem>
    );
  }

  return (
    <>
      <ContextMenuItem onClick={() => onView(persona)}>
        <HugeiconsIcon icon={ViewIcon} />
        View persona
      </ContextMenuItem>
      <ContextMenuItem
        disabled={scanDisabled}
        onClick={() => onRun(persona.id)}
      >
        <HugeiconsIcon icon={PlayIcon} />
        Run scan
      </ContextMenuItem>
      <ContextMenuItem
        disabled={mutationDisabled}
        onClick={() => onToggle(persona)}
      >
        <HugeiconsIcon icon={persona.enabled ? PauseIcon : PlayIcon} />
        {persona.enabled ? "Pause scans" : "Include in scans"}
      </ContextMenuItem>
      <ContextMenuItem
        disabled={mutationDisabled}
        onClick={() => onRegenerate(persona.id)}
      >
        <HugeiconsIcon icon={RefreshIcon} />
        Regenerate persona
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        disabled={mutationDisabled}
        onClick={() => onDelete(persona)}
      >
        <HugeiconsIcon icon={Archive02Icon} />
        Archive persona
      </ContextMenuItem>
    </>
  );
}
