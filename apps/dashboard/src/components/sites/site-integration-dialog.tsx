"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  siteIntegrationSchemas,
  siteIntegrationUpdateSchema,
} from "@notra/sites-core/schemas/site-integrations";
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
import { useSaveSiteIntegration } from "@/lib/hooks/use-site-integrations";
import type { SiteIntegrationDialogProps } from "@/types/components/sites";
import type { SiteIntegrationValues } from "@/types/site-integrations";
import { toastCopyError } from "@/utils/copy-to-clipboard";
import { toErrorMessage } from "@/utils/error-message";
import {
  siteIntegrationFieldErrors,
  siteIntegrationFormValues,
  siteIntegrationSettingsFromValues,
} from "@/utils/site-integrations";

export function SiteIntegrationDialog({
  scope,
  provider,
  settings,
  open,
  onOpenChange,
}: SiteIntegrationDialogProps) {
  const t = useTranslations("sites.integrationsPage");
  const tCommon = useTranslations("common");
  const id = useId();
  const [values, setValues] = useState<SiteIntegrationValues>(() =>
    siteIntegrationFormValues(provider, settings)
  );
  const [showErrors, setShowErrors] = useState(false);
  const save = useSaveSiteIntegration(scope);
  const next = siteIntegrationSettingsFromValues(provider, values);
  const errors = siteIntegrationFieldErrors(provider, next);
  const hasErrors = Object.keys(errors).length > 0;
  const parsed = siteIntegrationSchemas[provider.id].safeParse(next);
  const configExample = JSON.stringify(
    { integrations: { [provider.id]: parsed.success ? parsed.data : next } },
    null,
    2
  );
  const connected = settings !== null;
  const removing = save.isPending && save.variables?.settings === null;

  const submit = (nextSettings: Record<string, unknown> | null) => {
    const update = siteIntegrationUpdateSchema.safeParse({
      provider: provider.id,
      settings: nextSettings,
    });
    if (!update.success) {
      setShowErrors(true);
      return;
    }
    save.mutate(update.data, {
      onSuccess: () => {
        toast.success(nextSettings ? t("saved") : t("removed"), {
          description: t("savedDescription"),
        });
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(toErrorMessage(error, t("saveFailed")));
      },
    });
  };

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
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
            if (hasErrors) {
              setShowErrors(true);
              const invalidField = provider.fields.find(
                (field) => errors[field.key]
              );
              if (invalidField) {
                document.getElementById(`${id}-${invalidField.key}`)?.focus();
              }
              return;
            }
            submit(next);
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
                    disabled={save.isPending}
                    id={fieldId}
                    onCheckedChange={(checked) =>
                      setValues((current) => ({
                        ...current,
                        [field.key]: checked,
                      }))
                    }
                  />
                ) : (
                  <Input
                    aria-describedby={`${fieldId}-description${error ? ` ${fieldId}-error` : ""}`}
                    aria-invalid={error ? true : undefined}
                    autoCapitalize="none"
                    autoComplete="off"
                    disabled={save.isPending}
                    id={fieldId}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
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
        <ResponsiveDialogFooter className="shrink-0 sm:justify-between">
          {connected ? (
            <Button
              disabled={save.isPending && !removing}
              loading={removing}
              onClick={() => submit(null)}
              type="button"
              variant="destructive"
            >
              {t("remove")}
            </Button>
          ) : (
            <span aria-hidden="true" />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              disabled={save.isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              {tCommon("actions.cancel")}
            </Button>
            <Button
              disabled={removing}
              form={`${id}-form`}
              loading={save.isPending && !removing}
              type="submit"
            >
              {connected ? t("save") : t("connect")}
            </Button>
          </div>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
