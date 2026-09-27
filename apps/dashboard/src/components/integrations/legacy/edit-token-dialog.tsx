"use client";

import type { EditGitHubTokenFormValues } from "@notra/schemas/dashboard/integrations";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@notra/ui/components/shared/responsive-dialog";
import { Field, FieldLabel } from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type React from "react";
import { isValidElement, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { dashboardOrpc } from "@/lib/orpc/query";
import { createEditGitHubTokenFormSchema } from "@/schemas/github-integration-forms";
import type { EditTokenDialogProps } from "@/types/integrations";

export function LegacyEditTokenDialog({
  integration,
  organizationId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: EditTokenDialogProps) {
  const t = useTranslations("integrations.legacy.editToken");
  const tForms = useTranslations("integrations.githubForms");
  const tCommon = useTranslations("common");
  const editGitHubTokenFormSchema = useMemo(
    () => createEditGitHubTokenFormSchema(tForms),
    [tForms]
  );
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const queryClient = useQueryClient();
  const repository = integration.repositories[0];

  const mutation = useMutation({
    mutationFn: async (values: EditGitHubTokenFormValues) => {
      return dashboardOrpc.integrations.update.call({
        organizationId,
        integrationId: integration.id,
        token: values.token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.key(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.get.queryKey({
          input: {
            organizationId,
            integrationId: integration.id,
          },
        }),
      });
      toast.success(t("updated"));
      form.reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      token: "",
    },
    onSubmit: ({ value }) => {
      const validationResult = editGitHubTokenFormSchema.safeParse(value);
      if (!validationResult.success) {
        return;
      }
      mutation.mutate(validationResult.data);
    },
  });

  const triggerElement =
    trigger && isValidElement(trigger) ? (
      <ResponsiveDialogTrigger render={trigger as React.ReactElement} />
    ) : null;

  return (
    <>
      {triggerElement}
      <ResponsiveDialog onOpenChange={setOpen} open={open}>
        <ResponsiveDialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-[500px] [&>*]:min-w-0">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="text-2xl">
              {t("title")}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {repository
                ? t("descriptionWithRepo", {
                    repository: `${repository.owner}/${repository.repo}`,
                  })
                : t("description")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <div className="space-y-4 py-4">
              <form.Field
                name="token"
                validators={{
                  onChange: editGitHubTokenFormSchema.shape.token,
                }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel>{t("label")}</FieldLabel>
                    <Input
                      autoComplete="off"
                      disabled={mutation.isPending}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="github_pat_..."
                      type="password"
                      value={field.state.value}
                    />
                    {field.state.meta.errors.length > 0 ? (
                      <p className="text-destructive mt-1 text-sm">
                        {typeof field.state.meta.errors[0] === "string"
                          ? field.state.meta.errors[0]
                          : ((
                              field.state.meta.errors[0] as { message?: string }
                            )?.message ?? tCommon("labels.invalidValue"))}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground mt-2 text-xs">
                      {t.rich("help", {
                        link: (chunks) => (
                          <a
                            className="text-primary hover:underline"
                            href="https://github.com/settings/tokens/new?scopes=repo&description=Notra%20Integration"
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {chunks}
                          </a>
                        ),
                        code: (chunks) => (
                          <code className="text-xs">{chunks}</code>
                        ),
                      })}
                    </p>
                  </Field>
                )}
              </form.Field>
            </div>
            <ResponsiveDialogFooter>
              <ResponsiveDialogClose
                disabled={mutation.isPending}
                render={<Button variant="outline" />}
              >
                {tCommon("actions.cancel")}
              </ResponsiveDialogClose>
              <form.Subscribe selector={(state) => [state.canSubmit]}>
                {([canSubmit]) => (
                  <Button
                    disabled={!canSubmit || mutation.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      form.handleSubmit();
                    }}
                    type="button"
                  >
                    {mutation.isPending ? tCommon("actions.saving") : t("save")}
                  </Button>
                )}
              </form.Subscribe>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
