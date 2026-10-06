"use client";

import { Field, FieldError, FieldLabel } from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import { useTranslations } from "use-intl";

import {
  SITE_DEFAULT_BLOG_PATH,
  SITE_DEFAULT_CHANGELOG_PATH,
} from "@/constants/sites";
import type { SiteCreateSectionFieldsProps } from "@/types/components/sites";

export function SiteCreateSectionFields({
  idPrefix,
  plan,
  onBlogPathChange,
  onChangelogPathChange,
  error,
}: SiteCreateSectionFieldsProps) {
  const t = useTranslations("sites.sections");
  const sections = [
    {
      key: "blog",
      title: t("blog"),
      value: plan.blogPath,
      placeholder: SITE_DEFAULT_BLOG_PATH,
      onChange: onBlogPathChange,
    },
    {
      key: "changelog",
      title: t("changelog"),
      value: plan.changelogPath,
      placeholder: SITE_DEFAULT_CHANGELOG_PATH,
      onChange: onChangelogPathChange,
    },
  ];

  return (
    <div className="space-y-2">
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => {
          const id = `${idPrefix}-${section.key}-path`;
          return (
            <Field key={section.key}>
              <FieldLabel htmlFor={id}>{section.title}</FieldLabel>
              <Input
                autoComplete="off"
                id={id}
                onChange={(event) => section.onChange(event.target.value)}
                placeholder={section.placeholder}
                spellCheck={false}
                value={section.value}
              />
            </Field>
          );
        })}
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}
