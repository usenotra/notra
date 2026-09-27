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
import { Loader2Icon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

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
      toast.success("Collection renamed");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to rename collection");
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
          <ResponsiveDialogTitle>Rename collection</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Give this collection a name that is easy to recognize. It will not
            be overwritten by automatic naming.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor={inputId}>Name</Label>
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
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {rename.isPending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
