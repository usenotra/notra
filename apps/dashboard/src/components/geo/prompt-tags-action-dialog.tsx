import { useTranslations } from "next-intl";

import { PromptTagsDialog } from "@/components/geo/prompt-tags-dialog";
import type { PromptTagsActionDialogProps } from "@/types/geo";

export function PromptTagsActionDialog({
  target,
  suggestions,
  onConfirm,
  onClose,
}: PromptTagsActionDialogProps) {
  const t = useTranslations("geo.promptTagsActionDialog");
  const tGeoShared = useTranslations("geo.shared");
  const edit = target?.mode === "edit";
  return (
    <PromptTagsDialog
      confirmLabel={edit ? t("editConfirm") : tGeoShared("addTags")}
      description={edit ? t("editDescription") : t("bulkDescription")}
      initialTags={edit ? (target?.rows[0]?.tags ?? []) : []}
      onConfirm={onConfirm}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={target !== null}
      suggestions={suggestions}
      title={edit ? tGeoShared("editTags") : tGeoShared("addTags")}
    />
  );
}
