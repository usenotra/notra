"use client";

import { Badge } from "@notra/ui/components/ui/badge";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

import type { SkillCardProps } from "@/types/skills/page";
import { formatSkillUpdatedAt, skillDisplayName } from "@/utils/skills";

const SKILL_UPDATED_TITLE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short",
};

export function SkillCard({ skill, slug }: SkillCardProps) {
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const label = skillDisplayName(skill.name);
  const machineName =
    label.toLowerCase().split(" ").join("-") === skill.name ? null : skill.name;
  const updatedAt = new Date(skill.updatedAt);
  const updatedAtTime = updatedAt.getTime();
  const relative =
    formatSkillUpdatedAt(skill.updatedAt, locale) ?? tCommon("labels.justNow");
  // Default Link prefetch runs when a card enters the viewport, so opening the
  // list would fetch every detail route. Stay off until hover or focus.
  const [prefetch, setPrefetch] = useState<false | null>(false);
  const [absoluteTitle, setAbsoluteTitle] = useState<string>();

  function onCardPointerEnter() {
    setPrefetch(null);
    // The browser zone is only known on the client. Format the tooltip here so
    // mounting the grid does not render every card a second time.
    setAbsoluteTitle(
      new Date(updatedAtTime).toLocaleString(
        locale,
        SKILL_UPDATED_TITLE_OPTIONS
      )
    );
  }

  return (
    <Link
      className="focus-visible:ring-ring block h-full w-full min-w-0 rounded-xl focus-visible:ring-2 focus-visible:outline-none"
      href={`/${slug}/skills/${skill.name}`}
      onFocus={() => setPrefetch(null)}
      onMouseEnter={onCardPointerEnter}
      prefetch={prefetch}
    >
      <article className="border-border/80 border-b-border/40 bg-muted/80 hover:border-border flex h-full flex-col gap-1.5 rounded-xl border p-1.5 shadow-2xs transition-colors">
        <div className="border-border/60 bg-background flex min-h-28 flex-1 flex-col overflow-hidden rounded-lg border">
          <div className="px-3 pt-2.5 pb-1">
            <h2
              className="truncate text-sm leading-snug font-medium"
              title={label}
            >
              {label}
            </h2>
            {machineName ? (
              <p className="text-muted-foreground truncate font-mono text-xs">
                {machineName}
              </p>
            ) : null}
          </div>
          <p className="text-muted-foreground line-clamp-3 px-3 pt-1 pb-3 text-sm wrap-anywhere">
            {skill.description}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 px-1 pb-0.5">
          <Badge variant={skill.isSystem ? "secondary" : "outline"}>
            {skill.isSystem
              ? tCommon("labels.system")
              : tCommon("labels.customOwn")}
          </Badge>
          <time
            className="text-muted-foreground text-xs tabular-nums"
            dateTime={updatedAt.toISOString()}
            suppressHydrationWarning
            title={absoluteTitle}
          >
            {relative}
          </time>
        </div>
      </article>
    </Link>
  );
}
