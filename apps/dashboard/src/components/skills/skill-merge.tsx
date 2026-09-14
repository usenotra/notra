"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { UnresolvedFile } from "@pierre/diffs/react";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";

import { Button } from "@/components/button";
import { SkillMergeBoundary } from "@/components/skills/skill-merge-boundary";
import {
  SKILL_DIFF_FILE_NAME,
  SKILL_DIFF_LANGUAGE,
  SKILL_DIFF_THEMES,
} from "@/constants/skills";
import { useSkillDiffHighlighterReady } from "@/lib/hooks/use-skill-diff-highlighter";
import type { SkillConflictResolution } from "@/types/skills/merge";
import type { SkillMergeProps } from "@/types/skills/page";
import { parseSkillConflicts, resolveSkillConflict } from "@/utils/skill-merge";
import { resolveDiffThemeType } from "@/utils/skills";

const RESOLUTION_LABELS: {
  resolution: SkillConflictResolution;
  label: string;
}[] = [
  { resolution: "current", label: "Keep mine" },
  { resolution: "incoming", label: "Take Notra's" },
  { resolution: "both", label: "Keep both" },
];

/**
 * Conflict resolver for the three-way merge of a system skill. The parent owns
 * the merged text with its git conflict markers; `UnresolvedFile` renders them
 * and every resolution is applied to that text right away, so the parent
 * always holds what will actually be saved.
 */
export function SkillMerge({ text, onTextChange, resetKey }: SkillMergeProps) {
  const { resolvedTheme } = useTheme();
  const highlighterReady = useSkillDiffHighlighterReady();
  // Bumped per resolution so the uncontrolled resolver re-reads the text.
  const [step, setStep] = useState(0);

  const remaining = useMemo(() => parseSkillConflicts(text).length, [text]);

  const handleResolve = (
    conflictIndex: number,
    resolution: SkillConflictResolution
  ) => {
    onTextChange(resolveSkillConflict(text, conflictIndex, resolution));
    setStep((previous) => previous + 1);
  };

  if (!highlighterReady) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-3">
      <p aria-live="polite" className="text-muted-foreground text-sm">
        {remaining === 0
          ? "All conflicts resolved."
          : `${remaining} ${remaining === 1 ? "conflict" : "conflicts"} left`}
      </p>
      <div className="border-border/80 overflow-hidden rounded-lg border">
        <SkillMergeBoundary
          fallback={
            <Textarea
              aria-label="Merged skill content"
              className="max-h-[min(70vh,40rem)] min-h-64 resize-none overflow-y-auto rounded-none border-0 font-mono text-sm leading-relaxed"
              onChange={(event) => onTextChange(event.target.value)}
              spellCheck={false}
              value={text}
            />
          }
        >
          <UnresolvedFile
            file={{
              name: SKILL_DIFF_FILE_NAME,
              contents: text,
              lang: SKILL_DIFF_LANGUAGE,
            }}
            key={`${resetKey}:${step}`}
            options={{
              disableFileHeader: true,
              hunkSeparators: "line-info",
              lineDiffType: "word",
              overflow: "wrap",
              theme: SKILL_DIFF_THEMES,
              themeType: resolveDiffThemeType(resolvedTheme),
            }}
            renderMergeConflictUtility={(action) => (
              <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5">
                {RESOLUTION_LABELS.map(({ resolution, label }) => (
                  <Button
                    key={resolution}
                    onClick={() =>
                      handleResolve(action.conflictIndex, resolution)
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
          />
        </SkillMergeBoundary>
      </div>
    </div>
  );
}
