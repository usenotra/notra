"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { isValidElement, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogAction,
  DialogCancel,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { GitHubIntegration } from "@/types/integrations";
import { QUERY_KEYS } from "@/utils/query-keys";
import {
  type EditGitHubIntegrationFormValues,
  editGitHubIntegrationFormSchema,
} from "@/utils/schemas/integrations";

type EditIntegrationDialogProps = {
  integration: GitHubIntegration;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
};

export function EditIntegrationDialog({
  integration,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: EditIntegrationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (values: EditGitHubIntegrationFormValues) => {
      const response = await fetch(`/api/integrations/${integration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update integration");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.INTEGRATIONS.base,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.INTEGRATIONS.detail(integration.id),
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
      <DialogTrigger render={trigger as React.ReactElement} />
    ) : null;

  return (
    <>
      {triggerElement}
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit Integration</DialogTitle>
            <DialogDescription>
              Update your GitHub integration settings
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <div className="space-y-4 py-4">
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
                      <p className="mt-1 text-destructive text-sm">
                        {typeof field.state.meta.errors[0] === "string"
                          ? field.state.meta.errors[0]
                          : String(field.state.meta.errors[0])}
                      </p>
                    ) : null}
                  </Field>
                )}
              </form.Field>

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
            </div>
            <DialogFooter>
              <DialogCancel disabled={mutation.isPending}>Cancel</DialogCancel>
              <form.Subscribe selector={(state) => [state.canSubmit]}>
                {([canSubmit]) => (
                  <DialogAction
                    disabled={!canSubmit || mutation.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      form.handleSubmit();
                    }}
                    type="button"
                  >
                    {mutation.isPending ? "Saving..." : "Save Changes"}
                  </DialogAction>
                )}
              </form.Subscribe>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
