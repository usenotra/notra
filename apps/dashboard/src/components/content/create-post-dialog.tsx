"use client";

import { POST_TITLE_MAX_LENGTH } from "@notra/ai/schemas/limits";
import { supportsPostSlug } from "@notra/ai/schemas/post";
import {
  createPostFieldsSchema,
  type ManualPostContentType,
  optionalPostSlugSchema,
} from "@notra/schemas/shared/post";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { cn } from "@notra/ui/lib/utils";
import { useForm, useStore } from "@tanstack/react-form";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { OUTPUT_TYPE_LABEL_KEYS } from "@/constants/automation-output-types";
import {
  CREATE_POST_DEFAULT_FORMAT,
  CREATE_POST_FORMAT_ORDER,
} from "@/constants/content-formats";
import { useActiveProject } from "@/lib/hooks/use-active-project";
import { useCreatePost } from "@/lib/hooks/use-create-post";
import type {
  CreatePostDialogProps,
  CreatePostFormValues,
} from "@/types/content/create-post";
import { toErrorMessage } from "@/utils/error-message";
import { firstFieldErrorMessage } from "@/utils/form-field-error";
import { toManualPostContentType } from "@/utils/manual-post-content-type";
import { getOutputTypeIconClass, OutputTypeIcon } from "@/utils/output-types";

export function CreatePostDialog({
  open,
  onOpenChange,
  organizationId,
  organizationSlug,
}: CreatePostDialogProps) {
  const t = useTranslations("content.createPost");
  const tCommon = useTranslations("common");
  const id = useId();
  const router = useRouter();
  const slugEditedRef = useRef(false);
  const { projectId, isResolved: isProjectResolved } = useActiveProject();
  const mutation = useCreatePost(organizationId);

  const form = useForm({
    defaultValues: {
      contentType: CREATE_POST_DEFAULT_FORMAT,
      title: "",
      slug: "",
    } as CreatePostFormValues,
    onSubmit: async ({ value }) => {
      const slug = optionalPostSlugSchema.parse(value.slug);
      try {
        const result = await mutation.mutateAsync({
          organizationId,
          projectId: projectId ?? undefined,
          contentType: value.contentType,
          title: value.title.trim(),
          slug: supportsPostSlug(value.contentType) && slug ? slug : undefined,
        });
        form.reset();
        slugEditedRef.current = false;
        onOpenChange(false);
        toast.success(t("created"));
        router.push(`/${organizationSlug}/content/${result.contentId}`);
      } catch (error) {
        toast.error(toErrorMessage(error, t("createFailed")));
      }
    },
  });

  const contentType = useStore(form.store, (state) => state.values.contentType);
  const slugValue = useStore(form.store, (state) => state.values.slug);
  const showSlug = supportsPostSlug(contentType);
  const slugPreview = optionalPostSlugSchema.parse(slugValue);

  const closeDialog = () => {
    form.reset();
    slugEditedRef.current = false;
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      onOpenChange={(next) => {
        if (next) {
          onOpenChange(true);
          return;
        }
        closeDialog();
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
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="contentType">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-type`}>{tCommon("labels.type")}</Label>
                <Select
                  onValueChange={(value) =>
                    field.handleChange(toManualPostContentType(value ?? ""))
                  }
                  value={field.state.value}
                >
                  <SelectTrigger className="w-full" id={`${id}-type`}>
                    <SelectValue>
                      <span className="inline-flex items-center gap-2">
                        <OutputTypeIcon
                          className={cn(
                            "size-4",
                            getOutputTypeIconClass(field.state.value)
                          )}
                          outputType={field.state.value}
                        />
                        {tCommon(
                          `labels.${OUTPUT_TYPE_LABEL_KEYS[field.state.value]}`
                        )}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CREATE_POST_FORMAT_ORDER.map(
                      (format: ManualPostContentType) => (
                        <SelectItem key={format} value={format}>
                          <span className="inline-flex items-center gap-2">
                            <OutputTypeIcon
                              className={cn(
                                "size-4",
                                getOutputTypeIconClass(format)
                              )}
                              outputType={format}
                            />
                            {tCommon(
                              `labels.${OUTPUT_TYPE_LABEL_KEYS[format]}`
                            )}
                          </span>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <form.Field
            name="title"
            validators={{ onChange: createPostFieldsSchema.shape.title }}
          >
            {(field) => {
              const error = field.state.meta.isTouched
                ? firstFieldErrorMessage(
                    field.state.meta.errors,
                    tCommon("labels.invalidValue")
                  )
                : null;
              return (
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-title`}>
                    {tCommon("labels.name")}
                  </Label>
                  <Input
                    aria-describedby={error ? `${id}-title-error` : undefined}
                    aria-invalid={error !== null}
                    autoFocus
                    id={`${id}-title`}
                    maxLength={POST_TITLE_MAX_LENGTH}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      if (!slugEditedRef.current) {
                        form.setFieldValue(
                          "slug",
                          optionalPostSlugSchema.parse(event.target.value)
                        );
                      }
                    }}
                    placeholder={t("namePlaceholder")}
                    value={field.state.value}
                  />
                  {error ? (
                    <p
                      className="text-destructive text-xs"
                      id={`${id}-title-error`}
                    >
                      {error}
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>

          {showSlug ? (
            <form.Field
              name="slug"
              validators={{ onChange: optionalPostSlugSchema }}
            >
              {(field) => {
                const error = firstFieldErrorMessage(
                  field.state.meta.errors,
                  tCommon("labels.invalidValue")
                );
                return (
                  <div className="space-y-1.5">
                    <Label htmlFor={`${id}-slug`}>
                      {tCommon("labels.slug")}{" "}
                      <span className="text-muted-foreground font-normal">
                        {tCommon("labels.optional")}
                      </span>
                    </Label>
                    <Input
                      aria-describedby={
                        error ? `${id}-slug-error` : `${id}-slug-hint`
                      }
                      aria-invalid={error !== null}
                      id={`${id}-slug`}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        slugEditedRef.current = event.target.value.length > 0;
                        field.handleChange(event.target.value);
                      }}
                      placeholder="ship-notes-week-11"
                      value={field.state.value}
                    />
                    {error ? (
                      <p
                        className="text-destructive text-xs"
                        id={`${id}-slug-error`}
                      >
                        {error}
                      </p>
                    ) : (
                      <p
                        className="text-muted-foreground text-xs"
                        id={`${id}-slug-hint`}
                      >
                        {slugPreview
                          ? t("slugSavedAs", { slug: slugPreview })
                          : t("slugHint")}
                      </p>
                    )}
                  </div>
                );
              }}
            </form.Field>
          ) : null}

          <ResponsiveDialogFooter className="sm:justify-end">
            <Button onClick={closeDialog} type="button" variant="outline">
              {tCommon("actions.cancel")}
            </Button>
            <form.Subscribe
              selector={(state) =>
                [state.values.title, state.canSubmit] as const
              }
            >
              {([title, canSubmit]) => (
                <Button
                  disabled={
                    !canSubmit ||
                    title.trim().length === 0 ||
                    mutation.isPending ||
                    !isProjectResolved
                  }
                  type="submit"
                >
                  {mutation.isPending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : null}
                  {t("submit")}
                </Button>
              )}
            </form.Subscribe>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
