"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { RenameCollectionDialogProps } from "@/types/content/collection";

export function RenameCollectionDialog({
  collectionId,
  currentName,
  organizationId,
  open,
  onOpenChange,
}: RenameCollectionDialogProps) {
  const t = useTranslations("content.collections.renameDialog");
  const tContentShared = useTranslations("content.shared");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const inputId = useId();
  const queryClient = useQueryClient();
  const [name, setName] = useState(currentName);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevCurrentName, setPrevCurrentName] = useState(currentName);
  if (open !== prevOpen || currentName !== prevCurrentName) {
    setPrevOpen(open);
    setPrevCurrentName(currentName);
    if (open) {
      setName(currentName);
    }
  }

  const rename = useMutation({
    mutationFn: (nextName: string) =>
      dashboardOrpc.content.collections.rename.call({
        organizationId,
        collectionId,
        name: nextName,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.collections.list.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.collections.get.queryKey({
            input: { organizationId, collectionId },
          }),
        }),
      ]);
      toast.success(t("renamed"));
      onOpenChange(false);
    },
    onError: () => {
      toast.error(t("renameFailed"));
    },
  });

  const trimmed = name.trim();
  const trimmedCurrentName = currentName.trim();
  const canSubmit =
    trimmed.length > 0 && trimmed !== trimmedCurrentName && !rename.isPending;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }
    rename.mutate(trimmed);
  };

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {tContentShared("renameCollection")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("description")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor={inputId}>{tCommon2("labels.name")}</Label>
          <Input
            id={inputId}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSubmit();
              }
            }}
            value={name}
          />
        </div>

        <ResponsiveDialogFooter>
          <Button
            disabled={rename.isPending}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            {tCommon("cancel")}
          </Button>
          <Button
            disabled={!canSubmit}
            loading={rename.isPending}
            onClick={handleSubmit}
          >
            {tCommon("save")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
