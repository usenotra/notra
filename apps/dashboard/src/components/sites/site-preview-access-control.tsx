"use client";

import { ArrowDown01Icon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import { useId, useState } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { useSite } from "@/components/sites/site-context";
import { SitePreviewAccessModes } from "@/components/sites/site-preview-access-modes";
import { SitePreviewPasswordField } from "@/components/sites/site-preview-password-field";
import { useSavePreviewAccess } from "@/lib/hooks/use-save-preview-access";
import type { SitePreviewAccessFormProps } from "@/types/components/site-preview-access";
import type { SitePreviewAccessMode } from "@/types/site-preview-access";
import {
  sitePreviewAccessMode,
  sitePreviewAccessModeConfig,
  sitePreviewAccessPlan,
} from "@/utils/site-preview-access";

function PreviewAccessForm({ onDone }: SitePreviewAccessFormProps) {
  const t = useTranslations("sites.previewAccess");
  const tCommon = useTranslations("common");
  const id = useId();
  const { organizationId, siteId, detail } = useSite();
  const { site } = detail;

  const [enabled, setEnabled] = useState(site.previewsEnabled);
  const [mode, setMode] = useState<SitePreviewAccessMode>(() =>
    sitePreviewAccessMode(site)
  );
  const [password, setPassword] = useState("");
  const [editingPassword, setEditingPassword] = useState(
    !site.previewPasswordSetAt
  );
  const [showPassword, setShowPassword] = useState(false);

  const plan = sitePreviewAccessPlan(site, {
    enabled,
    mode,
    password,
    editingPassword,
  });
  const saveMutation = useSavePreviewAccess({
    organizationId,
    siteId,
    onSaved: onDone,
  });
  const canSave =
    plan.isDirty && !plan.passwordTooShort && !saveMutation.isPending;

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (canSave) {
          saveMutation.mutate(plan);
        }
      }}
    >
      <SitePreviewAccessModes
        idPrefix={id}
        mode={enabled ? mode : "off"}
        onModeChange={(next) => {
          setEnabled(next !== "off");
          if (next !== "off") {
            setMode(next);
          }
        }}
      />
      {!enabled ? (
        <p className="text-muted-foreground text-xs text-pretty">
          {site.previewsEnabled && detail.previews.length > 0
            ? t("buildOffWarning", { count: detail.previews.length })
            : t("buildOffHint")}
        </p>
      ) : null}
      {enabled && mode === "password" ? (
        <SitePreviewPasswordField
          editing={editingPassword}
          idPrefix={id}
          onEdit={() => setEditingPassword(true)}
          onChange={setPassword}
          onToggleShowPassword={() => setShowPassword((shown) => !shown)}
          value={password}
          passwordSetAt={site.previewPasswordSetAt}
          showPassword={showPassword}
          tooShort={plan.passwordTooShort}
        />
      ) : null}
      <div className="flex justify-end gap-2 pt-1">
        <Button
          disabled={saveMutation.isPending}
          onClick={onDone}
          type="button"
          variant="outline"
          size="sm"
        >
          {tCommon("actions.cancel")}
        </Button>
        <Button
          disabled={!canSave}
          loading={saveMutation.isPending}
          type="submit"
          size="sm"
        >
          {t("save")}
        </Button>
      </div>
    </form>
  );
}

export function SitePreviewAccessControl() {
  const t = useTranslations("sites.previewAccess");
  const { detail } = useSite();
  const { site } = detail;
  const [open, setOpen] = useState(false);
  const mode = sitePreviewAccessModeConfig(sitePreviewAccessMode(site));
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger render={<Button type="button" variant="outline" />}>
        <HugeiconsIcon
          aria-hidden="true"
          data-icon="inline-start"
          icon={site.previewsEnabled ? mode.icon : ViewOffIcon}
          strokeWidth={1.5}
        />
        {t(`trigger.${site.previewsEnabled ? mode.mode : "off"}`)}
        <HugeiconsIcon
          aria-hidden="true"
          data-icon="inline-end"
          icon={ArrowDown01Icon}
          strokeWidth={1.5}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)]">
        <PopoverTitle>{t("title")}</PopoverTitle>
        {open ? <PreviewAccessForm onDone={() => setOpen(false)} /> : null}
      </PopoverContent>
    </Popover>
  );
}
