"use client";

import { POST_TITLE_MAX_LENGTH } from "@notra/ai/schemas/limits";
import { supportsPostSlug } from "@notra/ai/schemas/post";
import {
  type ManualPostContentType,
  postSlugPreviewSchema,
} from "@notra/schemas/dashboard/content";
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
import { useRouter } from "next/navigation";
import { useId, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import {
  CREATE_POST_DEFAULT_FORMAT,
  CREATE_POST_FORMAT_ORDER,
  FORMAT_CARD_META,
} from "@/constants/content-formats";
import { useActiveProject } from "@/lib/hooks/use-active-project";
import { useCreatePost } from "@/lib/hooks/use-create-post";
import type {
  CreatePostDialogProps,
  CreatePostFormValues,
} from "@/types/content/create-post";
import {
  validateCreatePostSlug,
  validateCreatePostTitle,
} from "@/utils/create-post-validation";
import { toErrorMessage } from "@/utils/error-message";
import { toManualPostContentType } from "@/utils/manual-post-content-type";
import { getOutputTypeIconClass, OutputTypeIcon } from "@/utils/output-types";

export function CreatePostDialog({
  open,
  onOpenChange,
  organizationId,
  organizationSlug,
}: CreatePostDialogProps) {
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
      const slug = postSlugPreviewSchema.parse(value.slug);
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
        toast.success("Post created");
        router.push(`/${organizationSlug}/content/${result.contentId}`);
      } catch (error) {
        toast.error(toErrorMessage(error, "Failed to create post"));
      }
    },
  });

  const contentType = useStore(form.store, (state) => state.values.contentType);
  const slugValue = useStore(form.store, (state) => state.values.slug);
  const showSlug = supportsPostSlug(contentType);
  const slugPreview = postSlugPreviewSchema.parse(slugValue);

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
          <ResponsiveDialogTitle>New empty post</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Start from a blank page and write it yourself or with the agent.
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
                <Label htmlFor={`${id}-type`}>Type</Label>
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
                        {FORMAT_CARD_META[field.state.value].label}
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
                            {FORMAT_CARD_META[format].label}
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
            validators={{
              onChange: ({ value }) => validateCreatePostTitle(value),
            }}
          >
            {(field) => {
              const error =
                field.state.meta.isTouched && field.state.meta.errors[0]
                  ? String(field.state.meta.errors[0])
                  : null;
              return (
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-title`}>Name</Label>
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
                          postSlugPreviewSchema.parse(event.target.value)
                        );
                      }
                    }}
                    placeholder="Ship notes for week 11"
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
              validators={{
                onChange: ({ value }) => validateCreatePostSlug(value),
              }}
            >
              {(field) => {
                const error = field.state.meta.errors[0]
                  ? String(field.state.meta.errors[0])
                  : null;
                return (
                  <div className="space-y-1.5">
                    <Label htmlFor={`${id}-slug`}>
                      Slug{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
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
                          ? `Saved as ${slugPreview}`
                          : "Inferred from the name. Leave empty to set it later."}
                      </p>
                    )}
                  </div>
                );
              }}
            </form.Field>
          ) : null}

          <ResponsiveDialogFooter className="sm:justify-end">
            <Button onClick={closeDialog} type="button" variant="outline">
              Cancel
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
                  Create post
                </Button>
              )}
            </form.Subscribe>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
