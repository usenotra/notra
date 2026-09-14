"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { mergeThreeWay } from "@notra/utils/three-way-merge";
import { useMemo, useState } from "react";

import { Button } from "@/components/button";
import { SkillDiff } from "@/components/skills/skill-diff";
import { SkillMerge } from "@/components/skills/skill-merge";
import type {
  SkillUpdateDialogFooterProps,
  SkillUpdateDialogProps,
} from "@/types/skills/page";
import { parseSkillConflicts } from "@/utils/skill-merge";

type SkillUpdateStep = "review" | "resolve";

const MERGE_MINE_LABEL = "Your version";

function SkillUpdateDialogFooter({
  isModified,
  isResolving,
  canSaveResolved,
  pending,
  onBack,
  onDiscard,
  onMerge,
  onSaveResolved,
}: SkillUpdateDialogFooterProps) {
  if (isResolving) {
    return (
      <ResponsiveDialogFooter>
        <Button disabled={pending} onClick={onBack} variant="outline">
          Back
        </Button>
        <Button disabled={pending || !canSaveResolved} onClick={onSaveResolved}>
          {pending ? "Saving…" : "Save merged version"}
        </Button>
      </ResponsiveDialogFooter>
    );
  }

  if (isModified) {
    return (
      <ResponsiveDialogFooter>
        <Button disabled={pending} onClick={onDiscard} variant="outline">
          Discard my changes
        </Button>
        <Button disabled={pending} onClick={onMerge}>
          {pending ? "Merging…" : "Merge"}
        </Button>
      </ResponsiveDialogFooter>
    );
  }

  return (
    <ResponsiveDialogFooter>
      <Button disabled={pending} onClick={onDiscard}>
        {pending ? "Updating…" : "Update"}
      </Button>
    </ResponsiveDialogFooter>
  );
}

/**
 * Review a newer Notra version of a system skill. Unedited copies just update;
 * edited copies either merge (resolving conflicts when both sides touched the
 * same lines) or discard their edits.
 */
export function SkillUpdateDialog({
  open,
  onOpenChange,
  name,
  detail,
  content,
  description,
  descriptionModified,
  pending,
  onUpgrade,
}: SkillUpdateDialogProps) {
  const [step, setStep] = useState<SkillUpdateStep>("review");
  // The merge being resolved, owned here so saving reads it directly.
  const [mergeText, setMergeText] = useState("");

  const latestLabel = `Notra v${detail.latest.version}`;
  const merged = useMemo(
    () =>
      mergeThreeWay({
        base: detail.base.content,
        mine: content,
        theirs: detail.latest.content,
        labels: { mine: MERGE_MINE_LABEL, theirs: latestLabel },
      }),
    [detail.base.content, detail.latest.content, content, latestLabel]
  );

  const isResolving = step === "resolve";
  const canSaveResolved =
    isResolving && parseSkillConflicts(mergeText).length === 0;
  const mergedDescription = descriptionModified
    ? description
    : detail.latest.description;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setStep("review");
    }
    onOpenChange(next);
  };

  const handleMerge = () => {
    if (merged.hasConflicts) {
      setMergeText(merged.text);
      setStep("resolve");
      return;
    }
    onUpgrade("merge", {
      content: merged.text,
      description: mergedDescription,
    });
  };

  const handleSaveResolved = () => {
    onUpgrade("merge", {
      content: mergeText,
      description: mergedDescription,
    });
  };

  const title = isResolving
    ? "Resolve conflicts"
    : `Update ${name} to v${detail.latest.version}`;
  const subtitle = isResolving
    ? "You and Notra changed the same lines. Pick a side for each."
    : (detail.latest.changelog ??
      "Notra published a new version of this skill.");

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogContent className="flex max-h-[85svh] flex-col gap-4 overflow-hidden sm:max-w-3xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{subtitle}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="border-border/80 min-h-0 flex-1 overflow-auto rounded-xl border">
          {isResolving ? (
            <div className="p-3">
              <SkillMerge
                onTextChange={setMergeText}
                resetKey={`${name}:${detail.latest.version}`}
                text={mergeText}
              />
            </div>
          ) : (
            <SkillDiff
              after={{ label: latestLabel, content: detail.latest.content }}
              before={{
                label: `Notra v${detail.base.version}`,
                content: detail.base.content,
              }}
            />
          )}
        </div>

        {detail.isModified && !isResolving ? (
          <p className="text-muted-foreground text-sm">
            You edited this skill. Merge keeps your edits and adds these
            changes. Discard replaces your version.
          </p>
        ) : null}

        <SkillUpdateDialogFooter
          canSaveResolved={canSaveResolved}
          isModified={detail.isModified}
          isResolving={isResolving}
          onBack={() => setStep("review")}
          onDiscard={() => onUpgrade("discard")}
          onMerge={handleMerge}
          onSaveResolved={handleSaveResolved}
          pending={pending}
        />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
