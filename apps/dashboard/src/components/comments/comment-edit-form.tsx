"use client";

import { Textarea } from "@notra/ui/components/ui/textarea";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type { CommentEditFormProps } from "@/types/comments";

export function CommentEditForm({
  draft,
  disabled,
  onDraftChange,
  onCancel,
  onSave,
}: CommentEditFormProps) {
  const t = useTranslations("comments");
  const tCommon = useTranslations("common.actions");
  return (
    <form
      className="mt-2 space-y-2"
      action={() => {
        void onSave();
      }}
    >
      <Textarea
        aria-label={t("editComment")}
        maxLength={10000}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {tCommon("cancel")}
        </Button>
        <Button size="sm" type="submit" disabled={disabled || !draft.trim()}>
          {tCommon("save")}
        </Button>
      </div>
    </form>
  );
}
