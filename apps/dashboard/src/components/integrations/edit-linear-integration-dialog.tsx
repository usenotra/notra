"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Field, FieldLabel } from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { Switch } from "@notra/ui/components/ui/switch";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { LinearIntegration } from "@/types/integrations";

interface EditLinearIntegrationDialogProps {
  integration: LinearIntegration;
  organizationId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditLinearIntegrationDialog({
  integration,
  organizationId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: EditLinearIntegrationDialogProps) {
  const t = useTranslations("integrations.editLinearDialog");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (values: { displayName: string; enabled: boolean }) => {
      return dashboardOrpc.integrations.linear.update.call({
        organizationId,
        integrationId: integration.id,
        displayName: values.displayName,
        enabled: values.enabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.linear.list.queryKey({
          input: { organizationId },
        }),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.linear.get.queryKey({
          input: {
            organizationId,
            integrationId: integration.id,
          },
        }),
      });
      toast.success(tIntegrationsShared("integrationUpdatedSuccessfully"));
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
      if (!value.displayName.trim()) {
        return;
      }
      mutation.mutate(value);
    },
  });

  return (
    <ResponsiveDialog onOpenChange={setOpen} open={open}>
      <ResponsiveDialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-[500px] [&>*]:min-w-0">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="text-2xl">
            {tIntegrationsShared("editIntegration")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("description")}
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
                    <Label>{tIntegrationsShared("enableIntegration")}</Label>
                    <p className="text-muted-foreground text-sm">
                      {tIntegrationsShared("whenDisabledNoOutputsWill")}
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

            <form.Field name="displayName">
              {(field) => (
                <Field>
                  <FieldLabel>{tIntegrationsShared("displayName")}</FieldLabel>
                  <Input
                    disabled={mutation.isPending}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={t("displayNamePlaceholder")}
                    value={field.state.value}
                  />
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
                  {mutation.isPending
                    ? tCommon("actions.saving")
                    : tCommon("actions.saveChanges")}
                </Button>
              )}
            </form.Subscribe>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
