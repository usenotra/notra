"use client";

import { Textarea } from "@notra/ui/components/ui/textarea";

import { Button } from "@/components/button";
import type { CommentEditFormProps } from "@/types/comments";

export function CommentEditForm({
  draft,
  disabled,
  onDraftChange,
  onCancel,
  onSave,
}: CommentEditFormProps) {
  return (
    <form
      className="mt-2 space-y-2"
      action={() => {
        void onSave();
      }}
    >
      <Textarea
        aria-label="Edit comment"
        maxLength={10000}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" type="submit" disabled={disabled || !draft.trim()}>
          Save
        </Button>
      </div>
    </form>
  );
}
