import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/components/button";
import type { BlogPreviewActionsProps } from "@/types/content/ai-preview";

export function BlogPreviewActions({
  organizationSlug,
  postId,
  onRevise,
  onDeny,
  onSave,
  isFinished,
  isSaving,
  canSave,
  savedStatus,
}: BlogPreviewActionsProps) {
  const t = useTranslations("ai.preview");
  const tLabels = useTranslations("common.labels");
  const tToolBlock = useTranslations("ai.toolBlock");
  if (isFinished) {
    return (
      <div className="border-border bg-muted/30 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
        {savedStatus === "published" ? (
          <span className="text-muted-foreground text-xs">
            {tLabels("published")}
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {onRevise ? (
            <Button onClick={onRevise} size="sm" variant="ghost">
              {t("askForChanges")}
            </Button>
          ) : null}
          {postId ? (
            <Button
              nativeButton={false}
              render={<Link href={`/${organizationSlug}/content/${postId}`} />}
              size="sm"
            >
              {tToolBlock("openInEditor")}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }
  if (!canSave) {
    return null;
  }
  return (
    <div className="border-border bg-muted/30 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
      {onDeny ? (
        <Button
          className="-ml-2.5"
          disabled={isSaving}
          onClick={onDeny}
          size="sm"
          variant="ghost"
        >
          {tLabels("discard")}
        </Button>
      ) : null}
      <Button className="ml-auto" loading={isSaving} onClick={onSave} size="sm">
        {t("saveAsDraft")}
      </Button>
    </div>
  );
}
