"use client";

import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useState } from "react";

import { Button } from "@/components/button";
import { useGeoProjectsDb } from "@/lib/hooks/use-geo-db";
import type { GeoProjectDeleteSectionProps } from "@/types/geo";

export function GeoProjectDeleteSection({
  organizationId,
  project,
  replacementProjectId,
  onDeleted,
}: GeoProjectDeleteSectionProps) {
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
      heading="Delete project"
      headingAs="h2"
    >
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm text-pretty">
          {isLastProject
            ? "This is your only project. Create another project before deleting it."
            : "Permanently delete this project and all of its tracking data."}
        </p>
        <Button
          disabled={isLastProject}
          onClick={() => setOpen(true)}
          type="button"
          variant="destructive"
        >
          <HugeiconsIcon className="size-4" icon={Delete02Icon} />
          Delete project
        </Button>
      </div>

      <ResponsiveAlertDialog
        onOpenChange={(nextOpen) => {
          if (!isDeleting) {
            setOpen(nextOpen);
          }
        }}
        open={open}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>
              Delete “{project.name}”?
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              This permanently deletes its settings, prompts, competitors,
              scans, and reports. This action cannot be undone.
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel disabled={isDeleting}>
              Cancel
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
              variant="destructive"
            >
              {isDeleting ? "Deleting..." : "Delete project"}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </TitleCard>
  );
}
