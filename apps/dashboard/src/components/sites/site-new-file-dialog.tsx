"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Input } from "@notra/ui/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@notra/ui/components/ui/input-group";
import { Label } from "@notra/ui/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { Button } from "@/components/button";
import {
  SITE_NEW_FILE_EXTENSION,
  SITE_NEW_FILE_SLUG_PATTERN,
} from "@/constants/sites";
import type { SiteNewFileDialogProps, SiteNewFileFolder } from "@/types/sites";
import { siteNewFileTemplate, slugifyFileName } from "@/utils/site-editor";

export function SiteNewFileDialog({
  open,
  onOpenChange,
  existingPaths,
  folders,
  isCreating,
  onCreate,
}: SiteNewFileDialogProps) {
  const t = useTranslations("sites.newFile");
  const tSections = useTranslations("sites.sections");
  const tCommon = useTranslations("common");
  const id = useId();
  const [folder, setFolder] = useState<SiteNewFileFolder>(folders[0] ?? "blog");
  const [title, setTitle] = useState("");
  const [fileName, setFileName] = useState("");
  const slug = fileName.trim() || slugifyFileName(title);
  const path = `${folder}/${slug}${SITE_NEW_FILE_EXTENSION}`;
  const slugValid = SITE_NEW_FILE_SLUG_PATTERN.test(slug);
  const exists = existingPaths.has(path);
  const canCreate = title.trim().length > 0 && slugValid && !exists;

  const reset = () => {
    setTitle("");
    setFileName("");
  };

  let hint = slug ? t("pathHint", { path }) : t("invalidName");
  if (slug && !slugValid) {
    hint = t("invalidName");
  } else if (exists) {
    hint = t("exists", { path });
  }

  return (
    <ResponsiveDialog
      onOpenChange={(next) => {
        if (!next) {
          reset();
        }
        onOpenChange(next);
      }}
      open={open}
    >
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("title")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("description")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          className="space-y-4"
          id={`${id}-form`}
          onSubmit={(event) => {
            event.preventDefault();
            if (canCreate && !isCreating) {
              onCreate(path, siteNewFileTemplate(folder, title, new Date()));
            }
          }}
        >
          {folders.length > 1 ? (
            <Tabs
              onValueChange={(value) => {
                const next = folders.find((candidate) => candidate === value);
                if (next) {
                  setFolder(next);
                }
              }}
              value={folder}
            >
              <TabsList aria-label={t("section")} className="w-full">
                {folders.map((candidate) => (
                  <TabsTrigger
                    className="flex-1"
                    key={candidate}
                    value={candidate}
                  >
                    {tSections(candidate)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor={`${id}-title`}>{t("postTitle")}</Label>
            <Input
              autoComplete="off"
              id={`${id}-title`}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                folder === "changelog"
                  ? t("changelogPlaceholder")
                  : t("blogPlaceholder")
              }
              value={title}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-file`}>{t("fileName")}</Label>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>{folder}/</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                aria-describedby={`${id}-hint`}
                aria-invalid={
                  (slug.length > 0 && !slugValid) || exists || undefined
                }
                autoCapitalize="none"
                autoComplete="off"
                id={`${id}-file`}
                onChange={(event) =>
                  setFileName(event.target.value.toLowerCase())
                }
                placeholder={slugifyFileName(title) || "my-post"}
                spellCheck={false}
                value={fileName}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>{SITE_NEW_FILE_EXTENSION}</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            <p
              className={
                exists || (slug.length > 0 && !slugValid)
                  ? "text-destructive text-xs"
                  : "text-muted-foreground text-xs"
              }
              id={`${id}-hint`}
            >
              {hint}
            </p>
          </div>
        </form>
        <ResponsiveDialogFooter>
          <Button
            disabled={isCreating}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            {tCommon("actions.cancel")}
          </Button>
          <Button
            disabled={!canCreate}
            form={`${id}-form`}
            loading={isCreating}
            type="submit"
          >
            {tCommon("actions.create")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
