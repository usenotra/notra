"use client";

import { GEO_PROMPT_MAX_TAGS } from "@notra/geo-core/constants/geo";
import { normalizePromptTags } from "@notra/geo-core/utils/geo-prompt-tags";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Badge } from "@notra/ui/components/ui/badge";
import { type FormEvent, useId, useState } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { GeoTagList } from "@/components/geo/geo-tag-list";
import type { PromptTagsDialogProps, PromptTagsFormProps } from "@/types/geo";

function PromptTagsForm({
  formId,
  initialTags,
  suggestions,
  onSubmit,
}: PromptTagsFormProps) {
  const t = useTranslations("geo.promptTagsDialog");
  const tGeoShared = useTranslations("geo.shared");
  const inputId = useId();
  const [tags, setTags] = useState<string[]>(initialTags);
  const selectedTags = new Set(tags);
  const available = suggestions.filter((tag) => !selectedTags.has(tag));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(normalizePromptTags(tags));
  };

  return (
    <form
      className="space-y-4 px-4 md:px-0"
      id={formId}
      onSubmit={handleSubmit}
    >
      <GeoTagList
        id={inputId}
        label={tGeoShared("tags")}
        max={GEO_PROMPT_MAX_TAGS}
        onChange={(values) => setTags(normalizePromptTags(values))}
        placeholder={t("placeholder")}
        values={tags}
      />
      {available.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs">{t("suggestions")}</p>
          <div className="flex flex-wrap gap-1.5">
            {available.map((tag) => (
              <Badge
                className="cursor-pointer"
                key={tag}
                onClick={() => setTags(normalizePromptTags([...tags, tag]))}
                render={<button type="button" />}
                variant="outline"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}

export function PromptTagsDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  initialTags,
  suggestions,
  onConfirm,
}: PromptTagsDialogProps) {
  const tCommon = useTranslations("common.actions");
  const formId = useId();

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {description}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {open ? (
          <PromptTagsForm
            formId={formId}
            initialTags={initialTags}
            key={initialTags.join(" ")}
            onSubmit={(tags) => {
              onConfirm(tags);
              onOpenChange(false);
            }}
            suggestions={suggestions}
          />
        ) : null}
        <ResponsiveDialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            {tCommon("cancel")}
          </Button>
          <Button form={formId} type="submit">
            {confirmLabel}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
