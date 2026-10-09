"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { siteIntegrationSchemas } from "@notra/sites-core/schemas/site-integrations";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { CopyButton } from "@notra/ui/components/ui/copy-button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import { Switch } from "@notra/ui/components/ui/switch";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { SiteIntegrationLogo } from "@/components/sites/site-integration-logo";
import { SiteIntegrationSaveStatus } from "@/components/sites/site-integration-save-status";
import { useSiteIntegrationAutosave } from "@/lib/hooks/use-site-integration-autosave";
import type { SiteIntegrationDialogProps } from "@/types/components/sites";
import type { SiteIntegrationValues } from "@/types/site-integrations";
import { toastCopyError } from "@/utils/copy-to-clipboard";
import {
  siteIntegrationFieldErrors,
  siteIntegrationFormValues,
  siteIntegrationSettingsFromValues,
  siteIntegrationUpdateFromValues,
} from "@/utils/site-integrations";

export function SiteIntegrationDialog({
  scope,
  provider,
  settings,
  open,
  onOpenChange,
}: SiteIntegrationDialogProps) {
  const t = useTranslations("sites.integrationsPage");
  const id = useId();
  const [values, setValues] = useState<SiteIntegrationValues>(() =>
    siteIntegrationFormValues(provider, settings)
  );
  const [showErrors, setShowErrors] = useState(false);
  const [closing, setClosing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removalFailed, setRemovalFailed] = useState(false);
  const autosave = useSiteIntegrationAutosave(
    scope,
    siteIntegrationUpdateFromValues(provider, values) ?? {
      provider: provider.id,
      settings: null,
    }
  );
  const next = siteIntegrationSettingsFromValues(provider, values);
  const errors = siteIntegrationFieldErrors(provider, next);
  const hasErrors = Object.keys(errors).length > 0;
  const parsed = siteIntegrationSchemas[provider.id].safeParse(next);
  const configExample = JSON.stringify(
    { integrations: { [provider.id]: parsed.success ? parsed.data : next } },
    null,
    2
  );
  const connected = settings !== null || autosave.state.hasIntegration;
  const busy = closing || removing;

  const change = (key: string, value: string | boolean) => {
    setRemovalFailed(false);
    const changed = { ...values, [key]: value };
    setValues(changed);
    autosave.update(siteIntegrationUpdateFromValues(provider, changed));
  };

  const close = async () => {
    if (busy || removalFailed) {
      return;
    }
    if (autosave.state.dirty && hasErrors) {
      setShowErrors(true);
      return;
    }
    setClosing(true);
    const saved = !autosave.state.dirty || (await autosave.flush());
    setClosing(false);
    if (saved) {
      onOpenChange(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    autosave.update({ provider: provider.id, settings: null });
    const removed = await autosave.flush();
    if (!removed) {
      // Navigation must not retry a failed removal in the unmount save.
      await autosave.cancel();
    }
    setRemovalFailed(!removed);
    setRemoving(false);
    if (removed) {
      toast.success(t("removed"), { description: t("savedDescription") });
      onOpenChange(false);
    }
  };

  const discard = async () => {
    setClosing(true);
    await autosave.cancel();
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          void close();
        }
      }}
      open={open}
    >
      <ResponsiveDialogContent className="flex max-h-[85svh] flex-col overflow-hidden sm:max-w-md">
        <ResponsiveDialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <SiteIntegrationLogo provider={provider} />
            <div className="min-w-0 space-y-0.5 text-left">
              <ResponsiveDialogTitle>{provider.name}</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {t(`providers.${provider.id}`)}
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>
        <form
          className="min-h-0 min-w-0 space-y-4 overflow-y-auto"
          id={`${id}-form`}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void close();
          }}
        >
          {provider.fields.map((field) => {
            const fieldId = `${id}-${field.key}`;
            const label = t(
              `fields.${provider.id}.${field.key}` as Parameters<typeof t>[0]
            );
            const error = showErrors ? errors[field.key] : undefined;
            const value = values[field.key];
            return (
              <Field data-invalid={error ? true : undefined} key={field.key}>
                <FieldLabel htmlFor={fieldId}>
                  {label}
                  {field.optional ? (
                    <span className="text-muted-foreground font-normal">
                      {t("optional")}
                    </span>
                  ) : null}
                </FieldLabel>
                {field.type === "boolean" ? (
                  <Switch
                    aria-label={label}
                    checked={values[field.key] === true}
                    aria-describedby={`${fieldId}-description`}
                    disabled={busy}
                    id={fieldId}
                    onCheckedChange={(checked) => change(field.key, checked)}
                  />
                ) : (
                  <Input
                    aria-describedby={`${fieldId}-description${error ? ` ${fieldId}-error` : ""}`}
                    aria-invalid={error ? true : undefined}
                    autoCapitalize="none"
                    autoComplete="off"
                    disabled={busy}
                    id={fieldId}
                    onBlur={() => {
                      if (autosave.state.dirty) {
                        setShowErrors(true);
                      }
                    }}
                    onChange={(event) => change(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    spellCheck={false}
                    value={typeof value === "string" ? value : ""}
                  />
                )}
                <FieldDescription id={`${fieldId}-description`}>
                  {t(
                    `fieldDescriptions.${provider.id}.${field.key}` as Parameters<
                      typeof t
                    >[0]
                  )}
                </FieldDescription>
                {error ? (
                  <FieldError id={`${fieldId}-error`}>{error}</FieldError>
                ) : null}
              </Field>
            );
          })}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{t("configExample")}</p>
              <CopyButton
                aria-label={t("copyConfig")}
                disabled={hasErrors}
                onCopyError={toastCopyError}
                size="icon-xs"
                value={configExample}
              />
            </div>
            <pre className="bg-muted overflow-x-auto rounded-lg p-3 text-xs">
              <code>{configExample}</code>
            </pre>
            <FieldDescription>{t("previewDescription")}</FieldDescription>
          </div>
          <FieldDescription>
            <a
              className="inline-flex items-center gap-1"
              href={provider.docsUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {t("docs", { provider: provider.name })}
              <HugeiconsIcon
                aria-hidden="true"
                icon={ArrowUpRight01Icon}
                size={12}
              />
            </a>
          </FieldDescription>
        </form>
        <SiteIntegrationSaveStatus
          state={autosave.state}
          invalid={hasErrors}
          busy={busy}
          removalFailed={removalFailed}
          onRetry={() => {
            if (removalFailed) {
              void remove();
            } else {
              void autosave.flush();
            }
          }}
        />
        <ResponsiveDialogFooter className="shrink-0 sm:flex-wrap sm:justify-between">
          {connected ? (
            <Button
              disabled={busy}
              loading={removing}
              onClick={() => {
                void remove();
              }}
              type="button"
              variant="destructive"
            >
              {t("remove")}
            </Button>
          ) : (
            <span aria-hidden="true" />
          )}
          <div className="flex min-w-0 flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
            {autosave.state.dirty &&
            (hasErrors || autosave.state.status === "error") ? (
              <Button
                disabled={busy}
                onClick={() => {
                  void discard();
                }}
                type="button"
                variant="outline"
              >
                {t("discardUnsaved")}
              </Button>
            ) : null}
            <Button
              disabled={busy || removalFailed}
              form={`${id}-form`}
              loading={closing}
              type="submit"
            >
              {t("close")}
            </Button>
          </div>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
