"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { useTranslations } from "next-intl";

import { CompetitorEditForm } from "@/components/geo/competitor-edit-form";
import type { CompetitorEditDialogProps } from "@/types/geo";

export function CompetitorEditDialog({
  open,
  onOpenChange,
  organizationId,
  competitor,
  initialName,
  onImportCsv,
}: CompetitorEditDialogProps) {
  const t = useTranslations("geo.competitorEditDialog");
  const tCommon = useTranslations("common");
  const tGeoShared = useTranslations("geo.shared");
  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="wrap-anywhere">
            {competitor
              ? tCommon("labels.editName", { name: competitor.name })
              : tGeoShared("addCompetitor")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {competitor ? t("editDescription") : t("addDescription")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <CompetitorEditForm
          competitor={competitor}
          initialName={initialName}
          onCancel={() => onOpenChange(false)}
          onDone={() => onOpenChange(false)}
          onImportCsv={
            onImportCsv
              ? () => {
                  onOpenChange(false);
                  onImportCsv();
                }
              : undefined
          }
          organizationId={organizationId}
        />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
