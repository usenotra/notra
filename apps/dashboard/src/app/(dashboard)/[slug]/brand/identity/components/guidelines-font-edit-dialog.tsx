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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useReducer } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { FONT_ROLE_OPTIONS } from "@/constants/brand-guideline-ui";
import { useUpdateGuidelineFont } from "@/lib/hooks/use-brand-guidelines";
import type { GuidelinesFontEditDialogProps } from "@/types/brand-identity";
import type { BrandGuidelineFontRole } from "@/types/hooks/brand-guidelines";

interface FontDialogState {
  family: string;
  lineHeight: string;
  role: BrandGuidelineFontRole;
  size: string;
  weight: string;
}

function updateFontDialogState(
  state: FontDialogState,
  next: Partial<FontDialogState>
) {
  return { ...state, ...next };
}

export function GuidelinesFontEditDialog({
  font,
  organizationId,
  voiceId,
  open,
  onOpenChange,
}: GuidelinesFontEditDialogProps) {
  const t = useTranslations("brand.guidelines");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const update = useUpdateGuidelineFont(organizationId, voiceId);
  const [state, setState] = useReducer(updateFontDialogState, {
    family: font.family,
    lineHeight: font.lineHeight ?? "",
    role: font.role,
    size: font.size ?? "",
    weight: font.weight ?? "",
  });
  const { family, lineHeight, role, size, weight } = state;

  const handleSave = async () => {
    const payload = {
      fontId: font.id,
      role,
      family: family.trim(),
      weight: weight.trim() || null,
      size: size.trim() || null,
      lineHeight: lineHeight.trim() || null,
    };
    try {
      await update.mutateAsync(payload);
      toast.success(t("fontDialog.updated"));
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("fontDialog.updateFailed")
      );
    }
  };

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("fontDialog.title")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("fontDialog.description")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="font-family">{t("fontDialog.family")}</Label>
            <Input
              id="font-family"
              onChange={(event) => setState({ family: event.target.value })}
              placeholder={t("fontDialog.familyPlaceholder")}
              value={family}
            />
          </div>

          <div className="space-y-2">
            <Label>{tCommon2("labels.role")}</Label>
            <Select
              items={Object.fromEntries(
                FONT_ROLE_OPTIONS.map((option) => [
                  option.value,
                  option.value === "unknown"
                    ? tCommon2("states.unknown")
                    : t(`fontRoles.${option.value}`),
                ])
              )}
              onValueChange={(next) => {
                const option = FONT_ROLE_OPTIONS.find((o) => o.value === next);
                if (option) {
                  setState({ role: option.value });
                }
              }}
              value={role}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value === "unknown"
                      ? tCommon2("states.unknown")
                      : t(`fontRoles.${option.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="font-weight">{tCommon2("labels.weight")}</Label>
              <Input
                id="font-weight"
                onChange={(event) => setState({ weight: event.target.value })}
                placeholder="400"
                value={weight}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="font-size">{tCommon2("labels.size")}</Label>
              <Input
                id="font-size"
                onChange={(event) => setState({ size: event.target.value })}
                placeholder="16px"
                value={size}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="font-line-height">
                {t("fontDialog.lineHeight")}
              </Label>
              <Input
                id="font-line-height"
                onChange={(event) =>
                  setState({ lineHeight: event.target.value })
                }
                placeholder="1.5"
                value={lineHeight}
              />
            </div>
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
