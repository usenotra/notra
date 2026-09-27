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
import { useTranslations } from "next-intl";
import { useReducer } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { COLOR_ROLE_OPTIONS } from "@/constants/brand-guideline-ui";
import { useBrandColorRoleLabels } from "@/lib/hooks/use-brand-color-role-labels";
import {
  useCreateGuidelineColor,
  useUpdateGuidelineColor,
} from "@/lib/hooks/use-brand-guidelines";
import type { GuidelinesColorEditDialogProps } from "@/types/brand-identity";
import type { BrandGuidelineColorRole } from "@/types/hooks/brand-guidelines";
import { toColorInputValue } from "@/utils/brand-guideline-display";

interface ColorDialogState {
  darkValue: string;
  lightValue: string;
  name: string;
  role: BrandGuidelineColorRole;
  usage: string;
}

function updateColorDialogState(
  state: ColorDialogState,
  next: Partial<ColorDialogState>
) {
  return { ...state, ...next };
}

export function GuidelinesColorEditDialog({
  color,
  presetRole,
  organizationId,
  voiceId,
  open,
  onOpenChange,
}: GuidelinesColorEditDialogProps) {
  const t = useTranslations("brand.guidelines");
  const colorRoleLabels = useBrandColorRoleLabels();
  const tBrandShared = useTranslations("brand.shared");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const update = useUpdateGuidelineColor(organizationId, voiceId);
  const create = useCreateGuidelineColor(organizationId, voiceId);
  const isCreate = color === null;
  const [state, setState] = useReducer(updateColorDialogState, {
    darkValue: color?.darkValue ?? "",
    lightValue: color?.lightValue ?? "#000000",
    name: color?.name ?? "",
    role: color?.role ?? presetRole ?? "custom",
    usage: color?.usage ?? "",
  });
  const { darkValue, lightValue, name, role, usage } = state;
  const isPending = isCreate ? create.isPending : update.isPending;

  const handleSave = async () => {
    const payload = {
      role,
      name: name.trim() || null,
      lightValue: lightValue.trim(),
      darkValue: darkValue.trim() || null,
      usage: usage.trim() || null,
    };

    const successMessage = isCreate
      ? t("colorDialog.added")
      : t("colorDialog.updated");

    try {
      if (color) {
        await update.mutateAsync({ colorId: color.id, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      toast.success(successMessage);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("colorDialog.saveFailed")
      );
    }
  };

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {isCreate ? tBrandShared("addColor") : t("colorDialog.editTitle")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {isCreate
              ? t("colorDialog.addDescription")
              : t("colorDialog.editDescription")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="color-light-value">
              {t("colorDialog.lightColor")}
            </Label>
            <div className="flex items-center gap-2">
              <input
                aria-label={t("colorDialog.lightColorPicker")}
                className="size-9 shrink-0 cursor-pointer rounded-lg border bg-transparent"
                onChange={(event) =>
                  setState({ lightValue: event.target.value })
                }
                type="color"
                value={toColorInputValue(lightValue)}
              />
              <Input
                id="color-light-value"
                onChange={(event) =>
                  setState({ lightValue: event.target.value })
                }
                placeholder="#000000"
                value={lightValue}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color-dark-value">
              {t("colorDialog.darkColor")}
            </Label>
            <div className="flex items-center gap-2">
              <input
                aria-label={t("colorDialog.darkColorPicker")}
                className="size-9 shrink-0 cursor-pointer rounded-lg border bg-transparent"
                onChange={(event) =>
                  setState({ darkValue: event.target.value })
                }
                type="color"
                value={toColorInputValue(darkValue || lightValue)}
              />
              <Input
                id="color-dark-value"
                onChange={(event) =>
                  setState({ darkValue: event.target.value })
                }
                placeholder={t("colorDialog.darkPlaceholder")}
                value={darkValue}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color-name">{tCommon2("labels.name")}</Label>
            <Input
              id="color-name"
              onChange={(event) => setState({ name: event.target.value })}
              placeholder={t("colorDialog.namePlaceholder")}
              value={name}
            />
          </div>

          <div className="space-y-2">
            <Label>{tCommon2("labels.role")}</Label>
            <Select
              items={Object.fromEntries(
                COLOR_ROLE_OPTIONS.map((option) => [
                  option.value,
                  colorRoleLabels[option.value],
                ])
              )}
              onValueChange={(next) => {
                const option = COLOR_ROLE_OPTIONS.find((o) => o.value === next);
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
                {COLOR_ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {colorRoleLabels[option.value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color-usage">{t("colorDialog.usage")}</Label>
            <Input
              id="color-usage"
              onChange={(event) => setState({ usage: event.target.value })}
              placeholder={t("colorDialog.usagePlaceholder")}
              value={usage}
            />
          </div>
        </div>

        <ResponsiveDialogFooter>
          <Button
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            {tCommon("cancel")}
          </Button>
          <Button disabled={isPending} onClick={handleSave}>
            {isPending ? tCommon("saving") : tCommon("save")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
