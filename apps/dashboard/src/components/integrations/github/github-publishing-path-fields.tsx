"use client";

import {
  repositoryContentPathTemplateSchema,
  repositoryImagePathTemplateSchema,
} from "@notra/schemas/dashboard/integrations";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import { type FormEvent, useId } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import type { GitHubPublishingPathFieldsProps } from "@/types/integrations/github";

export function GitHubPublishingPathFields({
  contentLabel,
  contentPath,
  directory,
  disabled = false,
  imagePath,
  isSaving = false,
  onSave,
}: GitHubPublishingPathFieldsProps) {
  const contentPathId = useId();
  const imagePathId = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rawContentPath = String(formData.get("contentPath") ?? "").trim();
    const rawImagePath = String(formData.get("imagePath") ?? "").trim();
    const parsedContentPath = rawContentPath
      ? repositoryContentPathTemplateSchema.safeParse(rawContentPath)
      : null;
    const parsedImagePath = rawImagePath
      ? repositoryImagePathTemplateSchema.safeParse(rawImagePath)
      : null;
    const error =
      (parsedContentPath && !parsedContentPath.success
        ? parsedContentPath.error.issues[0]?.message
        : null) ??
      (parsedImagePath && !parsedImagePath.success
        ? parsedImagePath.error.issues[0]?.message
        : null);
    if (error) {
      toast.error(error);
      return;
    }

    onSave({
      contentPath: parsedContentPath?.data ?? null,
      imagePath: parsedImagePath?.data ?? null,
    });
  };

  return (
    <form className="max-w-xl space-y-4" onSubmit={handleSubmit}>
      <Field>
        <FieldLabel htmlFor={contentPathId}>Content file path</FieldLabel>
        <Input
          defaultValue={contentPath ?? ""}
          disabled={disabled || isSaving}
          id={contentPathId}
          name="contentPath"
          placeholder={`${directory}/:slug.md`}
        />
        <FieldDescription>
          Optional repository-relative path. Use <code>:slug</code> as a
          placeholder; both .md and .mdx are supported.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor={imagePathId}>Image file path</FieldLabel>
        <Input
          defaultValue={imagePath ?? ""}
          disabled={disabled || isSaving}
          id={imagePathId}
          name="imagePath"
          placeholder="public/blog/:slug/image"
        />
        <FieldDescription>
          Optional. Notra CDN images are copied into the pull request and their
          Markdown URLs are rewritten. Additional images receive a numbered
          suffix; <code>:index</code> is also supported.
        </FieldDescription>
      </Field>

      <Button
        disabled={disabled || isSaving}
        size="sm"
        type="submit"
        variant="outline"
      >
        {isSaving ? "Saving…" : `Save ${contentLabel.toLowerCase()} paths`}
      </Button>
    </form>
  );
}
