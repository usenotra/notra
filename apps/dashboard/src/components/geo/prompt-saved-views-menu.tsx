"use client";

import {
  ArrowDown01Icon,
  Bookmark02Icon,
  BookmarkAdd01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type {
  GeoPromptIntent,
  GeoPromptSource,
} from "@notra/geo-core/types/geo";
import { GEO_PROMPT_VIEW_NAME_MAX_LENGTH } from "@notra/schemas/constants/dashboard/geo-prompts";
import { geoPromptViewNameSchema } from "@notra/schemas/dashboard/geo-prompt-views";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";

import { Button } from "@/components/button";
import { useGeoPromptIntentLabel } from "@/lib/hooks/use-geo-prompt-intent-label";
import { useGeoPromptSourceLabels } from "@/lib/hooks/use-geo-prompt-source-labels";
import type {
  PromptSavedViewsMenuProps,
  PromptSaveViewDialogProps,
} from "@/types/geo";
import { promptFiltersSummary } from "@/utils/geo-prompt-views";

function PromptSaveViewDialog({
  open,
  onOpenChange,
  onSave,
}: PromptSaveViewDialogProps) {
  const t = useTranslations("geo.promptSavedViewsMenu");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const formId = useId();
  const nameId = useId();
  const [name, setName] = useState("");
  const parsed = geoPromptViewNameSchema.safeParse(name);

  const close = () => {
    setName("");
    onOpenChange(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!parsed.success) {
      return;
    }
    onSave(parsed.data);
    close();
  };

  return (
    <ResponsiveDialog
      onOpenChange={(next) => {
        if (next) {
          onOpenChange(true);
          return;
        }
        close();
      }}
      open={open}
    >
      <ResponsiveDialogContent className="sm:max-w-sm">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {tGeoShared("saveView")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("saveDescription")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          className="space-y-2 px-4 md:px-0"
          id={formId}
          onSubmit={handleSubmit}
        >
          <Label htmlFor={nameId}>{tCommon2("labels.name")}</Label>
          <Input
            autoFocus
            id={nameId}
            maxLength={GEO_PROMPT_VIEW_NAME_MAX_LENGTH}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("namePlaceholder")}
            value={name}
          />
        </form>
        <ResponsiveDialogFooter>
          <Button onClick={close} type="button" variant="outline">
            {tCommon("cancel")}
          </Button>
          <Button disabled={!parsed.success} form={formId} type="submit">
            {tGeoShared("saveView")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function PromptSavedViewsMenu({
  views,
  filters,
  onApply,
  onSave,
  onRemove,
}: PromptSavedViewsMenuProps) {
  const t = useTranslations("geo.promptSavedViewsMenu");
  const intentLabel = useGeoPromptIntentLabel();
  const sourceLabels = useGeoPromptSourceLabels();
  const summaryLabels = {
    all: t("allPrompts"),
    intent: (intent: GeoPromptIntent) => intentLabel(intent),
    source: (source: GeoPromptSource) => sourceLabels[source],
  };
  const [saveOpen, setSaveOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
          <HugeiconsIcon icon={Bookmark02Icon} size={14} />
          {t("trigger")}
          {views.length > 0 ? (
            <span className="text-muted-foreground tabular-nums">
              {views.length}
            </span>
          ) : null}
          <HugeiconsIcon
            className="text-muted-foreground"
            icon={ArrowDown01Icon}
            size={12}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("saved")}</DropdownMenuLabel>
            {views.length === 0 ? (
              <p className="text-muted-foreground px-1.5 py-1 text-xs">
                {t("empty")}
              </p>
            ) : (
              views.map((view) => (
                <DropdownMenuItem
                  className="justify-between gap-2"
                  key={view.id}
                  onClick={() => onApply(view)}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{view.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {promptFiltersSummary(view.query, summaryLabels)}
                    </span>
                  </span>
                  <Button
                    aria-label={t("removeAria", { name: view.name })}
                    className="size-6 shrink-0"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(view.id);
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={12} />
                  </Button>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSaveOpen(true)}>
            <HugeiconsIcon icon={BookmarkAdd01Icon} size={14} />
            <span className="flex min-w-0 flex-col">
              <span>{t("save")}</span>
              <span className="text-muted-foreground truncate text-xs">
                {promptFiltersSummary(filters, summaryLabels)}
              </span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PromptSaveViewDialog
        onOpenChange={setSaveOpen}
        onSave={onSave}
        open={saveOpen}
      />
    </>
  );
}
