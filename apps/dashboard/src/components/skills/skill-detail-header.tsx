"use client";

import { ArrowLeft02Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import Link from "@/components/framework/link";
import type { SkillDetailHeaderProps } from "@/types/skills/page";
import { skillDisplayName } from "@/utils/skills";

export function SkillDetailHeader({
  slug,
  name,
  isSystem,
  canDelete,
  deleteDisabled,
  onDelete,
}: SkillDetailHeaderProps) {
  const t = useTranslations("skills");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const label = skillDisplayName(name);
  const machineName =
    label.toLowerCase().split(" ").join("-") === name ? null : name;
  return (
    <div className="space-y-4">
      <Link
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        href={`/${slug}/skills`}
      >
        <HugeiconsIcon className="size-4" icon={ArrowLeft02Icon} />
        {tCommon2("labels.skills")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-full min-w-0 items-center gap-2.5">
          <div className="min-w-0">
            <h1
              className="truncate text-2xl font-semibold tracking-tight"
              title={label}
            >
              {label}
            </h1>
            {machineName ? (
              <p className="text-muted-foreground truncate font-mono text-xs">
                {machineName}
              </p>
            ) : null}
          </div>
          {isSystem ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Badge className="whitespace-nowrap" variant="secondary">
                      {tCommon2("labels.system")}
                    </Badge>
                  }
                />
                <TooltipContent>{t("detail.systemTooltip")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
        {canDelete ? (
          <Button
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive w-fit gap-1.5"
            disabled={deleteDisabled}
            onClick={onDelete}
            variant="outline"
          >
            <HugeiconsIcon className="size-4" icon={Delete02Icon} />
            {tCommon("delete")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
