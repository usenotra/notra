"use client";

import { Badge } from "@notra/ui/components/ui/badge";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import {
  RadioGroup,
  RadioGroupItem,
} from "@notra/ui/components/ui/radio-group";
import { Switch } from "@notra/ui/components/ui/switch";
import { useId } from "react";
import { useTranslations } from "use-intl";

import { cn } from "@/lib/utils";
import type {
  SiteChoiceGroupProps,
  SiteSectionRowProps,
  SiteSectionsFieldsProps,
} from "@/types/components/sites";

export function SiteChoiceGroup<T extends string>({
  label,
  value,
  options,
  onValueChange,
  disabled = false,
  hideLabel = false,
}: SiteChoiceGroupProps<T>) {
  const id = useId();
  return (
    <div className="space-y-2">
      <p
        className={cn("text-sm font-medium", hideLabel && "sr-only")}
        id={`${id}-label`}
      >
        {label}
      </p>
      <RadioGroup
        aria-labelledby={`${id}-label`}
        className="sm:grid-cols-2"
        disabled={disabled}
        onValueChange={(next) => {
          const option = options.find((candidate) => candidate.value === next);
          if (option && !option.disabled) {
            onValueChange(option.value);
          }
        }}
        value={value}
      >
        {options.map((option) => (
          <FieldLabel htmlFor={`${id}-${option.value}`} key={option.value}>
            <Field data-disabled={option.disabled} orientation="horizontal">
              <FieldContent>
                <FieldTitle>
                  {option.title}
                  {option.badge ? (
                    <Badge size="sm" variant="secondary">
                      {option.badge}
                    </Badge>
                  ) : null}
                </FieldTitle>
                <FieldDescription>{option.description}</FieldDescription>
              </FieldContent>
              <RadioGroupItem
                disabled={option.disabled}
                id={`${id}-${option.value}`}
                value={option.value}
              />
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
    </div>
  );
}

function SectionRow({
  id,
  title,
  description,
  enabled,
  path,
  onEnabledChange,
  onPathChange,
}: SiteSectionRowProps) {
  const t = useTranslations("sites.sections");
  return (
    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Switch
          aria-describedby={`${id}-description`}
          checked={enabled}
          className="mt-0.5"
          id={`${id}-enabled`}
          onCheckedChange={onEnabledChange}
        />
        <div className="min-w-0">
          <label
            className="cursor-pointer text-sm font-medium"
            htmlFor={`${id}-enabled`}
          >
            {title}
          </label>
          <p className="text-muted-foreground text-xs" id={`${id}-description`}>
            {description}
          </p>
        </div>
      </div>
      <Input
        aria-label={t("pathLabel", { section: title })}
        className="sm:w-44"
        disabled={!enabled}
        id={`${id}-path`}
        onChange={(event) => onPathChange(event.target.value)}
        placeholder="/"
        value={path}
      />
    </div>
  );
}

export function SiteSectionsFields({
  idPrefix,
  blogEnabled,
  changelogEnabled,
  blogPath,
  changelogPath,
  onBlogEnabledChange,
  onChangelogEnabledChange,
  onBlogPathChange,
  onChangelogPathChange,
}: SiteSectionsFieldsProps) {
  const t = useTranslations("sites.sections");
  const noneEnabled = !(blogEnabled || changelogEnabled);
  return (
    <div className="space-y-2">
      <div className="divide-border bg-card divide-y rounded-lg border">
        <SectionRow
          description={t("blogDescription")}
          enabled={blogEnabled}
          id={`${idPrefix}-blog`}
          onEnabledChange={onBlogEnabledChange}
          onPathChange={onBlogPathChange}
          path={blogPath}
          title={t("blog")}
        />
        <SectionRow
          description={t("changelogDescription")}
          enabled={changelogEnabled}
          id={`${idPrefix}-changelog`}
          onEnabledChange={onChangelogEnabledChange}
          onPathChange={onChangelogPathChange}
          path={changelogPath}
          title={t("changelog")}
        />
      </div>
      {noneEnabled ? (
        <p className="text-destructive text-xs" role="alert">
          {t("atLeastOne")}
        </p>
      ) : null}
    </div>
  );
}
