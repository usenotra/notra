"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type { IrisPauseDialogProps } from "@/types/iris";

export function IrisPauseDialog({
  open,
  isPausing,
  onOpenChange,
  onConfirm,
}: IrisPauseDialogProps) {
  const t = useTranslations("iris.pauseDialog");
  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("title")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("description")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <Button
            disabled={isPausing}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            {t("keepRunning")}
          </Button>
          <Button disabled={isPausing} onClick={onConfirm}>
            {isPausing ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                {t("pausing")}
              </>
            ) : (
              t("confirm")
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
