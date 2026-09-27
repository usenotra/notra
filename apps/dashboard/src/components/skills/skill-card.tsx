"use client";

import { Badge } from "@notra/ui/components/ui/badge";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import type { SkillCardProps } from "@/types/skills/page";
import { formatSkillUpdatedAt, skillDisplayName } from "@/utils/skills";

export function SkillCard({ skill, slug }: SkillCardProps) {
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const label = skillDisplayName(skill.name);
  const machineName =
    label.toLowerCase().split(" ").join("-") === skill.name ? null : skill.name;
  const updatedAt = new Date(skill.updatedAt);
  const relative =
    formatSkillUpdatedAt(skill.updatedAt, locale) ?? tCommon("labels.justNow");

  return (
    <Link
      className="focus-visible:ring-ring block h-full w-full min-w-0 rounded-xl focus-visible:ring-2 focus-visible:outline-none"
      href={`/${slug}/skills/${skill.name}`}
    >
      <article className="border-border/80 border-b-border/40 bg-muted/80 hover:border-border flex h-full flex-col gap-1.5 rounded-xl border p-1.5 shadow-2xs transition-colors">
        <div className="border-border/60 bg-background flex min-h-28 flex-1 flex-col overflow-hidden rounded-lg border">
          <div className="px-3 pt-2.5 pb-1">
            <h2 className="truncate text-sm leading-snug font-medium">
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
            title={updatedAt.toLocaleString(locale)}
          >
            {relative}
          </time>
        </div>
      </article>
    </Link>
  );
}
