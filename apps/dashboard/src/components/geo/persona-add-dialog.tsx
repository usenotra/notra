"use client";

import {
  GEO_PERSONA_BRIEF_MAX_LENGTH,
  GEO_PERSONA_MAX_COUNT,
} from "@notra/geo-core/constants/geo-personas";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@notra/ui/components/shared/responsive-dialog";
import { Label } from "@notra/ui/components/ui/label";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { useId, useState } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type { PersonaAddDialogProps } from "@/types/geo-personas-ui";

export function PersonaAddDialog({
  open,
  atLimit,
  onOpenChange,
  onSubmit,
  isPending,
}: PersonaAddDialogProps) {
  const t = useTranslations("geo.personaAddDialog");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const id = useId();
  const [brief, setBrief] = useState("");
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!brief.trim() || isPending || atLimit) {
              return;
            }
            if (await onSubmit(brief.trim())) {
              setBrief("");
            }
          }}
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t("title")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t("description")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="flex flex-col gap-3">
            <Label htmlFor={id}>{t("label")}</Label>
            <Textarea
              id={id}
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              required
              maxLength={GEO_PERSONA_BRIEF_MAX_LENGTH}
              disabled={isPending}
              placeholder={t("placeholder")}
              className="max-h-80 min-h-28 resize-none overflow-y-auto"
            />
            {atLimit ? (
              <p className="text-destructive text-sm" role="alert">
                {t("limitReached", { max: GEO_PERSONA_MAX_COUNT })}
              </p>
            ) : null}
          </div>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isPending || atLimit}>
              {isPending ? tCommon2("labels.starting") : t("generate")}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
