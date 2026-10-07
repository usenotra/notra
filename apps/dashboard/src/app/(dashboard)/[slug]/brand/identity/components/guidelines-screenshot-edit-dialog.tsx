"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Switch } from "@notra/ui/components/ui/switch";
import { useReducer } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { SCREENSHOT_KIND_OPTIONS } from "@/constants/brand-guideline-ui";
import { useUpdateGuidelineScreenshot } from "@/lib/hooks/use-brand-guidelines";
import type { GuidelinesScreenshotEditDialogProps } from "@/types/brand-identity";
import type { BrandGuidelineScreenshotKind } from "@/types/hooks/brand-guidelines";

interface ScreenshotDialogState {
  fullPage: boolean;
  kind: BrandGuidelineScreenshotKind;
}

function updateScreenshotDialogState(
  state: ScreenshotDialogState,
  next: Partial<ScreenshotDialogState>
) {
  return { ...state, ...next };
}

export function GuidelinesScreenshotEditDialog({
  screenshot,
  organizationId,
  voiceId,
  open,
  onOpenChange,
}: GuidelinesScreenshotEditDialogProps) {
  const t = useTranslations("brand.guidelines");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const update = useUpdateGuidelineScreenshot(organizationId, voiceId);
  const [state, setState] = useReducer(updateScreenshotDialogState, {
    fullPage: screenshot.fullPage,
    kind: screenshot.kind,
  });
  const { fullPage, kind } = state;

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        screenshotId: screenshot.id,
        kind,
        fullPage,
      });
      toast.success(t("screenshotDialog.updated"));
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("screenshotDialog.updateFailed")
      );
    }
  };

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("screenshotDialog.title")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("screenshotDialog.description")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{tCommon2("labels.type")}</Label>
            <Select
              onValueChange={(next) => {
                const option = SCREENSHOT_KIND_OPTIONS.find(
                  (o) => o.value === next
                );
                if (option) {
                  setState({ kind: option.value });
                }
              }}
              value={kind}
            >
              <SelectTrigger>
                <SelectValue>
                  {(value) => {
                    const option = SCREENSHOT_KIND_OPTIONS.find(
                      (o) => o.value === value
                    );
                    return option ? t(`screenshotKinds.${option.value}`) : "";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SCREENSHOT_KIND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(`screenshotKinds.${option.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="screenshot-full-page">
              {t("screenshots.fullPage")}
            </Label>
            <Switch
              checked={fullPage}
              id="screenshot-full-page"
              onCheckedChange={(checked) => setState({ fullPage: checked })}
            />
          </div>
        </div>

        <ResponsiveDialogFooter>
          <Button
            disabled={update.isPending}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            {tCommon("cancel")}
          </Button>
          <Button disabled={update.isPending} onClick={handleSave}>
            {update.isPending ? tCommon("saving") : tCommon("save")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
