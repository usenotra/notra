import { Button } from "@notra/ui/components/ui/button";

import { ContentPlanView } from "@/components/content/content-plan-view";
import type { ContentDetailDocumentProps } from "@/types/content/detail-document";

function PlanConflictAlert({
  onLoadLatest,
  onSaveVersion,
}: Pick<ContentDetailDocumentProps["plan"], "onLoadLatest" | "onSaveVersion">) {
  return (
    <div
      className="border-border bg-muted/50 mx-auto mb-6 flex w-full max-w-3xl flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
      role="alert"
    >
      <div>
        <p className="text-sm font-medium">This plan changed elsewhere</p>
        <p className="text-muted-foreground text-sm">
          Your edits are preserved. Choose which version to keep.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button onClick={onLoadLatest} size="sm" variant="outline">
          Load latest
        </Button>
        <Button onClick={onSaveVersion} size="sm">
          Save my version
        </Button>
      </div>
    </div>
  );
}

function ContentPlanSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="bg-muted/60 h-4 w-24 animate-pulse rounded-sm" />
      <div className="bg-muted/60 h-10 w-3/4 animate-pulse rounded-sm" />
      <div className="bg-muted/60 h-16 w-full animate-pulse rounded-sm" />
      <div className="bg-muted/60 h-40 w-full animate-pulse rounded-sm" />
    </div>
  );
}

export function ContentDetailDocument({
  editor,
  isPlanMode,
  plan,
}: ContentDetailDocumentProps) {
  if (!isPlanMode) {
    return editor;
  }
  if (!plan.brief) {
    return <ContentPlanSkeleton />;
  }

  return (
    <>
      {plan.hasConflict ? (
        <PlanConflictAlert
          onLoadLatest={plan.onLoadLatest}
          onSaveVersion={plan.onSaveVersion}
        />
      ) : null}
      <ContentPlanView
        brief={plan.brief}
        isWriting={plan.isWriting}
        key={`${plan.briefId ?? plan.contentId}:${plan.editorVersion}`}
        onChange={
          plan.isReviewable && !plan.hasConflict
            ? plan.onBriefChange
            : undefined
        }
        // A read-only plan reports "dirty" for an incomplete brief, which would
        // block the writer's completion notification, so only a reviewable plan
        // may report its dirty state.
        onDirtyChange={plan.isReviewable ? plan.onDirtyChange : undefined}
      />
    </>
  );
}
