"use client";

import { ArrowLeft02Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/button";
import { LazySkillDiff } from "@/components/skills/lazy-skill-diff";
import { SKILL_NAV_TRANSITION_TYPES } from "@/constants/skills";
import type { SkillDetailHeaderProps } from "@/types/skills/page";
import { getSkillStatus } from "@/utils/skills";

export function SkillDetailHeader({
  slug,
  name,
  canDelete,
  deleteDisabled,
  onDelete,
  upstream,
  upstreamDetail,
  content,
  actionsDisabled,
  upgradePending,
  onReviewUpdate,
  onUpgrade,
}: SkillDetailHeaderProps) {
  const [resetOpen, setResetOpen] = useState(false);
  const status = getSkillStatus(upstream);
  const hasUpdate = status === "update-available" || status === "conflict";
  // Resetting only makes sense for a modified copy; once the reset lands the
  // dialog closes on its own.
  const resetDialogOpen = resetOpen && status === "modified";

  return (
    <div className="space-y-4">
      <Link
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        href={`/${slug}/skills`}
        transitionTypes={[SKILL_NAV_TRANSITION_TYPES.back]}
      >
        <HugeiconsIcon className="size-4" icon={ArrowLeft02Icon} />
        Skills
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate font-mono text-2xl font-bold tracking-tight">
            {name}
          </h1>
          {upstream && upstream.systemName !== name ? (
            <p className="text-muted-foreground text-sm">
              Based on Notra's{" "}
              <span className="font-mono">{upstream.systemName}</span> skill
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasUpdate ? (
            <Button disabled={actionsDisabled} onClick={onReviewUpdate}>
              Review update
            </Button>
          ) : null}
          {status === "modified" ? (
            <Button
              disabled={actionsDisabled}
              onClick={() => setResetOpen(true)}
              variant="outline"
            >
              Reset to default
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive w-fit gap-1.5"
              disabled={deleteDisabled}
              onClick={onDelete}
              variant="outline"
            >
              <HugeiconsIcon className="size-4" icon={Delete02Icon} />
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <ResponsiveDialog onOpenChange={setResetOpen} open={resetDialogOpen}>
        <ResponsiveDialogContent className="flex max-h-[85svh] flex-col overflow-hidden sm:max-w-3xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Reset to default?</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {name} goes back to the version Notra ships. Your edits are not
              kept.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {upstreamDetail ? (
            <div className="border-border/80 min-h-0 flex-1 overflow-auto rounded-xl border">
              <LazySkillDiff
                after={{
                  label: `Notra v${upstreamDetail.latest.version}`,
                  content: upstreamDetail.latest.content,
                }}
                before={{ label: "Your version", content }}
              />
            </div>
          ) : null}
          <ResponsiveDialogFooter>
            <Button
              disabled={upgradePending}
              onClick={() => setResetOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={upgradePending}
              onClick={() => onUpgrade("discard")}
            >
              {upgradePending ? "Resetting…" : "Reset to default"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
