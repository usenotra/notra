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
import { Label } from "@notra/ui/components/ui/label";
import { useId, useState } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { SiteNewFileFolderTabs } from "@/components/sites/site-new-file-folder-tabs";
import { SiteNewFileNameField } from "@/components/sites/site-new-file-name-field";
import {
  SITE_NEW_FILE_EXTENSION,
  SITE_NEW_FILE_SLUG_PATTERN,
} from "@/constants/sites";
import type { SiteNewFileDialogProps } from "@/types/components/sites";
import type { SiteNewFileFolder } from "@/types/sites";
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
          <SiteNewFileFolderTabs
            folders={folders}
            onValueChange={setFolder}
            value={folder}
          />
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
          <SiteNewFileNameField
            exists={exists}
            folder={folder}
            id={id}
            onValueChange={setFileName}
            path={path}
            placeholder={slugifyFileName(title) || t("fileNamePlaceholder")}
            slug={slug}
            slugValid={slugValid}
            value={fileName}
          />
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
