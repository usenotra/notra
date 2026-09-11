"use client";

import {
  type EditGitHubTokenFormValues,
  editGitHubTokenFormSchema,
} from "@notra/schemas/dashboard/integrations";
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
import type React from "react";
import { isValidElement, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { EditTokenDialogProps } from "@/types/integrations";

export function LegacyEditTokenDialog({
  integration,
  organizationId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: EditTokenDialogProps) {
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
      toast.success("Personal access token updated");
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
              Update Personal Access Token
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {repository
                ? `Replace the GitHub token used for ${repository.owner}/${repository.repo}.`
                : "Replace the GitHub token used for this integration."}
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
                    <FieldLabel>GitHub Personal Access Token</FieldLabel>
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
                            )?.message ?? "Invalid value")}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground mt-2 text-xs">
                      <a
                        className="text-primary hover:underline"
                        href="https://github.com/settings/tokens/new?scopes=repo&description=Notra%20Integration"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Generate a token on GitHub
                      </a>{" "}
                      with <code className="text-xs">repo</code> scope.
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
                Cancel
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
                    {mutation.isPending ? "Saving..." : "Save Token"}
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
