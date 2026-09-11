import { PromptTagsDialog } from "@/components/geo/prompt-tags-dialog";
import { GEO_PROMPT_TAGS_COPY } from "@/constants/geo-prompts";
import type { PromptTagsActionDialogProps } from "@/types/geo";

export function PromptTagsActionDialog({
  target,
  suggestions,
  onConfirm,
  onClose,
}: PromptTagsActionDialogProps) {
  const edit = target?.mode === "edit";
  return (
    <PromptTagsDialog
      confirmLabel={
        edit ? GEO_PROMPT_TAGS_COPY.confirm : GEO_PROMPT_TAGS_COPY.bulkConfirm
      }
      description={
        edit
          ? GEO_PROMPT_TAGS_COPY.editDescription
          : GEO_PROMPT_TAGS_COPY.bulkDescription
      }
      initialTags={edit ? (target?.rows[0]?.tags ?? []) : []}
      onConfirm={onConfirm}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={target !== null}
      suggestions={suggestions}
      title={edit ? GEO_PROMPT_TAGS_COPY.edit : GEO_PROMPT_TAGS_COPY.bulkTitle}
    />
  );
}
