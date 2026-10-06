"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { useId, useState } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { useSite } from "@/components/sites/site-context";
import { SitePreviewAccessModes } from "@/components/sites/site-preview-access-modes";
import { SitePreviewBuildToggle } from "@/components/sites/site-preview-build-toggle";
import { SitePreviewPasswordField } from "@/components/sites/site-preview-password-field";
import { useSavePreviewAccess } from "@/lib/hooks/use-save-preview-access";
import type {
  SitePreviewAccessDialogProps,
  SitePreviewAccessFormProps,
} from "@/types/components/site-preview-access";
import type { SitePreviewAccessMode } from "@/types/site-preview-access";
import {
  sitePreviewAccessMode,
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
    <>
      <form
        className="space-y-5"
        id={`${id}-form`}
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) {
            saveMutation.mutate(plan);
          }
        }}
      >
        <SitePreviewBuildToggle
          enabled={enabled}
          id={`${id}-enabled`}
          onEnabledChange={setEnabled}
        />
        {enabled ? (
          <SitePreviewAccessModes
            idPrefix={id}
            mode={mode}
            onModeChange={setMode}
          />
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
      </form>
      <ResponsiveDialogFooter>
        <Button
          disabled={saveMutation.isPending}
          onClick={onDone}
          type="button"
          variant="outline"
        >
          {tCommon("actions.cancel")}
        </Button>
        <Button
          disabled={!canSave}
          form={`${id}-form`}
          loading={saveMutation.isPending}
          type="submit"
        >
          {t("save")}
        </Button>
      </ResponsiveDialogFooter>
    </>
  );
}

export function SitePreviewAccessDialog({
  open,
  onOpenChange,
}: SitePreviewAccessDialogProps) {
  const t = useTranslations("sites.previewAccess");
  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("title")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="sr-only">
            {t("description")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {open ? <PreviewAccessForm onDone={() => onOpenChange(false)} /> : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
