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
import { TOKEN_TYPE_OPTIONS } from "@/constants/brand-guideline-ui";
import { useUpdateGuidelineToken } from "@/lib/hooks/use-brand-guidelines";
import type { GuidelinesTokenEditDialogProps } from "@/types/brand-identity";
import type { BrandGuidelineTokenType } from "@/types/hooks/brand-guidelines";

interface TokenDialogState {
  name: string;
  type: BrandGuidelineTokenType;
  value: string;
}

function updateTokenDialogState(
  state: TokenDialogState,
  next: Partial<TokenDialogState>
) {
  return { ...state, ...next };
}

export function GuidelinesTokenEditDialog({
  token,
  organizationId,
  voiceId,
  open,
  onOpenChange,
}: GuidelinesTokenEditDialogProps) {
  const t = useTranslations("brand.guidelines");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const update = useUpdateGuidelineToken(organizationId, voiceId);
  const [state, setState] = useReducer(updateTokenDialogState, {
    name: token.name,
    type: token.type,
    value: token.value,
  });
  const { name, type, value } = state;

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        tokenId: token.id,
        type,
        name: name.trim(),
        value: value.trim(),
      });
      toast.success(t("tokenDialog.updated"));
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("tokenDialog.updateFailed")
      );
    }
  };

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("tokenDialog.title")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("tokenDialog.description")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="token-name">{tCommon2("labels.name")}</Label>
            <Input
              id="token-name"
              onChange={(event) => setState({ name: event.target.value })}
              placeholder={t("tokenDialog.namePlaceholder")}
              value={name}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token-value">{t("tokenDialog.value")}</Label>
            <Input
              id="token-value"
              onChange={(event) => setState({ value: event.target.value })}
              placeholder={t("tokenDialog.valuePlaceholder")}
              value={value}
            />
          </div>

          <div className="space-y-2">
            <Label>{tCommon2("labels.type")}</Label>
            <Select
              items={Object.fromEntries(
                TOKEN_TYPE_OPTIONS.map((option) => [
                  option.value,
                  option.value === "unknown"
                    ? tCommon2("labels.other")
                    : t(`tokenTypes.${option.value}`),
                ])
              )}
              onValueChange={(next) => {
                const option = TOKEN_TYPE_OPTIONS.find((o) => o.value === next);
                if (option) {
                  setState({ type: option.value });
                }
              }}
              value={type}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOKEN_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value === "unknown"
                      ? tCommon2("labels.other")
                      : t(`tokenTypes.${option.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
