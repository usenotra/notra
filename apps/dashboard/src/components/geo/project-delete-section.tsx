"use client";

import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ConfirmDialog } from "@notra/ui/components/shared/confirm-dialog";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useState } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { useGeoProjectsDb } from "@/lib/hooks/use-geo-db";
import type { GeoProjectDeleteSectionProps } from "@/types/geo";

export function GeoProjectDeleteSection({
  organizationId,
  project,
  replacementProjectId,
  onDeleted,
}: GeoProjectDeleteSectionProps) {
  const t = useTranslations("geo.projectDeleteSection");
  const tGeoShared = useTranslations("geo.shared");
  const [open, setOpen] = useState(false);
  const { deleteProject, isDeleting } = useGeoProjectsDb(organizationId);
  const isLastProject = replacementProjectId === undefined;

  const handleDelete = async () => {
    if (isLastProject || isDeleting) {
      return;
    }

    try {
      await deleteProject(project.id);
    } catch {
      return;
    }
    setOpen(false);
    onDeleted(replacementProjectId);
  };

  return (
    <TitleCard
      as="section"
      className="border-destructive/50 bg-destructive/5"
      heading={tGeoShared("deleteProject")}
      headingAs="h2"
    >
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm text-pretty">
          {isLastProject ? t("onlyProject") : t("description")}
        </p>
        <Button
          className="self-end"
          disabled={isLastProject}
          onClick={() => setOpen(true)}
          type="button"
          variant="destructive"
        >
          <HugeiconsIcon className="size-4" icon={Delete02Icon} />
          {tGeoShared("deleteProject")}
        </Button>
      </div>

      <ConfirmDialog
        confirmLabel={tGeoShared("deleteProject")}
        description={t("confirmDescription")}
        onConfirm={handleDelete}
        onOpenChange={setOpen}
        open={open}
        pending={isDeleting}
        title={t("confirmTitle", { name: project.name })}
        variant="destructive"
      />
    </TitleCard>
  );
}
