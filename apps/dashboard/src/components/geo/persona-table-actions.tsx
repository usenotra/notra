"use client";

import {
  Delete02Icon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
}: PersonaTableRowActionsProps) {
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
              aria-label={`Delete ${persona.name}`}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation();
                onDelete(persona);
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon icon={Delete02Icon} size={16} />
            </Button>
          }
        />
        <TooltipContent>Delete persona</TooltipContent>
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
  onRun,
  onToggle,
  onView,
}: PersonaTableContextMenuProps) {
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
        variant="destructive"
      >
        <HugeiconsIcon icon={Delete02Icon} />
        Delete persona
      </ContextMenuItem>
    </>
  );
}
