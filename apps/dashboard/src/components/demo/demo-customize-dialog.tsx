"use client";

import type { DemoPersonalization } from "@notra/db/types/demo";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Button } from "@notra/ui/components/ui/button";
import { Field, FieldLabel } from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import {
  DEMO_PERSONALIZATION_COMPANY_MAX,
  DEMO_PERSONALIZATION_NAME_MAX,
} from "@/constants/demo";
import { demoPersonalizationSchema } from "@/schemas/demo";
import { demoHomePath } from "@/utils/demo-return-to";
import { rebuildDemoSandbox } from "@/utils/demo-sandbox-request";

interface DemoCustomizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: DemoPersonalization | null;
}

/**
 * "Customize your experience": rebuilds the demo workspace around the
 * visitor's name and company, so every page shows their brand instead of
 * the sample one.
 */
export function DemoCustomizeDialog({
  open,
  onOpenChange,
  current,
}: DemoCustomizeDialogProps) {
  const t = useTranslations("demo.customize");
  const [firstName, setFirstName] = useState(current?.firstName ?? "");
  const [lastName, setLastName] = useState(current?.lastName ?? "");
  const [companyName, setCompanyName] = useState(current?.companyName ?? "");
  const [saving, setSaving] = useState(false);

  const parsed = demoPersonalizationSchema.safeParse({
    firstName,
    lastName,
    companyName,
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!parsed.success || saving) {
      return;
    }
    setSaving(true);
    try {
      const slug = await rebuildDemoSandbox("customize", parsed.data);
      window.location.assign(demoHomePath(slug));
    } catch {
      setSaving(false);
      toast.error(t("failed"));
    }
  };

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t("title")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t("description")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="demo-first-name">
                {t("firstName")}
              </FieldLabel>
              <Input
                autoComplete="given-name"
                disabled={saving}
                id="demo-first-name"
                maxLength={DEMO_PERSONALIZATION_NAME_MAX}
                onChange={(event) => setFirstName(event.target.value)}
                required
                value={firstName}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="demo-last-name">{t("lastName")}</FieldLabel>
              <Input
                autoComplete="family-name"
                disabled={saving}
                id="demo-last-name"
                maxLength={DEMO_PERSONALIZATION_NAME_MAX}
                onChange={(event) => setLastName(event.target.value)}
                value={lastName}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="demo-company">{t("companyName")}</FieldLabel>
            <Input
              autoComplete="organization"
              disabled={saving}
              id="demo-company"
              maxLength={DEMO_PERSONALIZATION_COMPANY_MAX}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Fieldnote"
              required
              value={companyName}
            />
          </Field>
          <p className="text-muted-foreground text-sm">{t("note")}</p>
          <ResponsiveDialogFooter>
            <Button
              disabled={saving}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              {t("cancel")}
            </Button>
            <Button disabled={!parsed.success || saving} type="submit">
              {saving ? t("saving") : t("submit")}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
