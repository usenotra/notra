"use client";

import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { cn } from "@notra/ui/lib/utils";
import { MultiFileDiff } from "@pierre/diffs/react";
import { useTheme } from "next-themes";

import {
  SKILL_DIFF_FILE_NAME,
  SKILL_DIFF_LANGUAGE,
  SKILL_DIFF_THEMES,
} from "@/constants/skills";
import { useSkillDiffHighlighterReady } from "@/lib/hooks/use-skill-diff-highlighter";
import type { SkillDiffProps } from "@/types/skills/page";
import { resolveDiffThemeType, withTrailingNewline } from "@/utils/skills";

/**
 * Every skill diff in the dashboard: saved vs unsaved in the editor, and the
 * upstream change in the update dialog. Always unified, with our own header
 * row so the two sides are labelled in plain words instead of file paths.
 */
export function SkillDiff({ before, after, className }: SkillDiffProps) {
  const { resolvedTheme } = useTheme();
  const highlighterReady = useSkillDiffHighlighterReady();

  if (before.content === after.content) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex items-center justify-center py-12 text-sm",
          className
        )}
      >
        No differences
      </div>
    );
  }

  if (!highlighterReady) {
    return <Skeleton className={cn("h-48 w-full rounded-none", className)} />;
  }

  return (
    <div className={cn("overflow-hidden", className)}>
      <div className="border-border/60 bg-muted/40 text-muted-foreground flex items-center border-b px-3 py-2 text-xs font-medium">
        <span className="inline-flex items-center gap-1.5 truncate">
          {before.label}
          <HugeiconsIcon
            aria-hidden="true"
            className="size-3.5 shrink-0"
            icon={ArrowRight02Icon}
          />
          {after.label}
        </span>
      </div>
      <MultiFileDiff
        newFile={{
          name: SKILL_DIFF_FILE_NAME,
          contents: withTrailingNewline(after.content),
          lang: SKILL_DIFF_LANGUAGE,
        }}
        oldFile={{
          name: SKILL_DIFF_FILE_NAME,
          contents: withTrailingNewline(before.content),
          lang: SKILL_DIFF_LANGUAGE,
        }}
        options={{
          diffStyle: "unified",
          disableFileHeader: true,
          expandUnchanged: false,
          hunkSeparators: "line-info",
          lineDiffType: "word",
          overflow: "wrap",
          theme: SKILL_DIFF_THEMES,
          themeType: resolveDiffThemeType(resolvedTheme),
        }}
      />
    </div>
  );
}
