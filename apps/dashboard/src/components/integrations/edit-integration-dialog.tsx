"use client";

import {
  type EditGitHubIntegrationFormValues,
  editGitHubIntegrationFormSchema,
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
import { Label } from "@notra/ui/components/ui/label";
import { Switch } from "@notra/ui/components/ui/switch";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { isValidElement, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { GitHubIntegration } from "@/types/integrations";

interface EditIntegrationDialogProps {
  integration: GitHubIntegration;
  organizationId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function EditIntegrationDialog({
  integration,
  organizationId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: EditIntegrationDialogProps) {
  const firstRepository = integration.repositories[0];
  const primaryRepository =
    integration.repositories.length === 1 && firstRepository
      ? firstRepository
      : null;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (values: EditGitHubIntegrationFormValues) => {
      const trimmedOwner = values.owner.trim();
      const trimmedRepo = values.repo.trim();
      const ownerChanged =
        primaryRepository !== null && trimmedOwner !== primaryRepository.owner;
      const repoChanged =
        primaryRepository !== null && trimmedRepo !== primaryRepository.repo;

      return dashboardOrpc.integrations.update.call({
        organizationId,
        integrationId: integration.id,
        displayName: values.displayName,
        enabled: values.enabled,
        ...(primaryRepository
          ? {
              ...(ownerChanged ? { owner: trimmedOwner } : {}),
              ...(repoChanged ? { repo: trimmedRepo } : {}),
              branch: values.branch?.trim() || null,
            }
          : {}),
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
      toast.success("Integration updated successfully");
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      displayName: integration.displayName,
      enabled: integration.enabled,
      owner: primaryRepository?.owner ?? "",
      repo: primaryRepository?.repo ?? "",
      branch: primaryRepository?.defaultBranch ?? "",
    },
    onSubmit: ({ value }) => {
      const validationResult = editGitHubIntegrationFormSchema.safeParse(value);
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
              Edit Integration
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Update your GitHub integration settings
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
              <form.Field name="enabled">
                {(field) => (
                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                      <Label>Enable Integration</Label>
                      <p className="text-muted-foreground text-sm">
                        When disabled, no outputs will be generated
                      </p>
                    </div>
                    <Switch
                      checked={field.state.value}
                      disabled={mutation.isPending}
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field
                name="displayName"
                validators={{
                  onChange: editGitHubIntegrationFormSchema.shape.displayName,
                }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel>Display Name</FieldLabel>
                    <Input
                      disabled={mutation.isPending}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="My GitHub Integration"
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
                  </Field>
                )}
              </form.Field>

              {primaryRepository ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <form.Field
                      name="owner"
                      validators={{
                        onChange: editGitHubIntegrationFormSchema.shape.owner,
                      }}
                    >
                      {(field) => (
                        <Field>
                          <FieldLabel>Owner</FieldLabel>
                          <Input
                            disabled={mutation.isPending}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="owner"
                            value={field.state.value}
                          />
                          {field.state.meta.errors.length > 0 ? (
                            <p className="text-destructive mt-1 text-sm">
                              {typeof field.state.meta.errors[0] === "string"
                                ? field.state.meta.errors[0]
                                : ((
                                    field.state.meta.errors[0] as {
                                      message?: string;
                                    }
                                  )?.message ?? "Invalid value")}
                            </p>
                          ) : null}
                        </Field>
                      )}
                    </form.Field>
                    <form.Field
                      name="repo"
                      validators={{
                        onChange: editGitHubIntegrationFormSchema.shape.repo,
                      }}
                    >
                      {(field) => (
                        <Field>
                          <FieldLabel>Repository</FieldLabel>
                          <Input
                            disabled={mutation.isPending}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="repo"
                            value={field.state.value}
                          />
                          {field.state.meta.errors.length > 0 ? (
                            <p className="text-destructive mt-1 text-sm">
                              {typeof field.state.meta.errors[0] === "string"
                                ? field.state.meta.errors[0]
                                : ((
                                    field.state.meta.errors[0] as {
                                      message?: string;
                                    }
                                  )?.message ?? "Invalid value")}
                            </p>
                          ) : null}
                        </Field>
                      )}
                    </form.Field>
                  </div>

                  <form.Field name="branch">
                    {(field) => (
                      <Field>
                        <FieldLabel>Default Branch</FieldLabel>
                        <Input
                          disabled={mutation.isPending}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="main"
                          value={field.state.value ?? ""}
                        />
                      </Field>
                    )}
                  </form.Field>
                </>
              ) : null}
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
                    {mutation.isPending ? "Saving..." : "Save Changes"}
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
