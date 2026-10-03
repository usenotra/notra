"use client";

import {
  Archive02Icon,
  ArchiveRestoreIcon,
  PauseIcon,
  PlayIcon,
  Refresh03Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_PERSONA_BILLING_MULTIPLIER,
  GEO_PERSONA_MAX_COUNT,
} from "@notra/geo-core/constants/geo-personas";
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@notra/ui/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("geo.personaTableActions");
  const tGeoShared = useTranslations("geo.shared");
  if (persona.archivedAt) {
    const reactivateDisabled = disabled || restoreDisabled;
    let tooltip = t("reactivate");
    if (restoreDisabled) {
      tooltip = t("restoreLimit", { max: GEO_PERSONA_MAX_COUNT });
    } else if (disabled) {
      tooltip = t("waitForAction");
    }
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={t("reactivateAria", { name: persona.name })}
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
    <TooltipProvider>
      <div className="flex items-center justify-end gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={t("regenerateAria", { name: persona.name })}
                disabled={disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onRegenerate(persona.id);
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <HugeiconsIcon icon={Refresh03Icon} size={16} />
              </Button>
            }
          />
          <TooltipContent>{t("regenerate")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={t("archiveAria", { name: persona.name })}
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
          <TooltipContent>{tGeoShared("archivePersona")}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
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
  const t = useTranslations("geo.personaTableActions");
  const tGeoShared = useTranslations("geo.shared");
  if (persona.archivedAt) {
    return (
      <ContextMenuItem
        disabled={mutationDisabled || restoreDisabled}
        onClick={() => onRestore(persona.id)}
      >
        <HugeiconsIcon icon={ArchiveRestoreIcon} />
        {t("reactivate")}
      </ContextMenuItem>
    );
  }

  return (
    <>
      <ContextMenuItem onClick={() => onView(persona)}>
        <HugeiconsIcon icon={ViewIcon} />
        {t("view")}
      </ContextMenuItem>
      <ContextMenuItem
        disabled={scanDisabled}
        onClick={() => onRun(persona.id)}
      >
        <HugeiconsIcon icon={PlayIcon} />
        {tGeoShared("runScan")}
        <span className="sr-only">
          {t("answerCost", { multiplier: GEO_PERSONA_BILLING_MULTIPLIER })}
        </span>
        <ContextMenuShortcut aria-hidden="true">
          {GEO_PERSONA_BILLING_MULTIPLIER}×
        </ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem
        disabled={mutationDisabled}
        onClick={() => onToggle(persona)}
      >
        <HugeiconsIcon icon={persona.enabled ? PauseIcon : PlayIcon} />
        {persona.enabled ? t("pauseScans") : t("includeInScans")}
      </ContextMenuItem>
      <ContextMenuItem
        disabled={mutationDisabled}
        onClick={() => onRegenerate(persona.id)}
      >
        <HugeiconsIcon icon={Refresh03Icon} />
        {t("regenerate")}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        disabled={mutationDisabled}
        onClick={() => onDelete(persona)}
      >
        <HugeiconsIcon icon={Archive02Icon} />
        {tGeoShared("archivePersona")}
      </ContextMenuItem>
    </>
  );
}
