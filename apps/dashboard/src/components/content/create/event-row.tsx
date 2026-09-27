"use client";

import {
  GitCommitIcon,
  GitPullRequestIcon,
  Rocket01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import { cn } from "@notra/ui/lib/utils";
import { useTranslations } from "next-intl";

import { EVENT_BADGE } from "@/constants/content-preview";
import type { EventType } from "@/types/content/preview";

const EVENT_ICON: Record<EventType, typeof GitPullRequestIcon> = {
  PR: GitPullRequestIcon,
  Commit: GitCommitIcon,
  Release: Rocket01Icon,
  LinearIssue: Tick01Icon,
};

interface EventRowProps {
  label: string;
  meta: string;
  type: EventType;
  selected: boolean;
  onToggle: () => void;
}

export function EventRow({
  label,
  meta,
  type,
  selected,
  onToggle,
}: EventRowProps) {
  const t = useTranslations("content.create.eventTypes");
  const tCommon = useTranslations("common.labels");
  const typeLabels: Record<EventType, string> = {
    Commit: tCommon("commit"),
    PR: t("PR"),
    Release: tCommon("release"),
    LinearIssue: tCommon("issue"),
  };
  return (
    <button
      className={cn(
        "hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
        selected && "bg-muted/20"
      )}
      onClick={onToggle}
      type="button"
    >
      <div
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30"
        )}
      >
        {selected && <HugeiconsIcon className="size-3" icon={Tick01Icon} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm" title={label}>
          {label}
        </p>
        <p className="text-muted-foreground truncate text-xs">{meta}</p>
      </div>
      <Badge className={cn("shrink-0", EVENT_BADGE[type])}>
        <HugeiconsIcon className="size-3!" icon={EVENT_ICON[type]} />
        {typeLabels[type]}
      </Badge>
    </button>
  );
}
