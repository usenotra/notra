"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { addGranolaIntegrationFormSchema } from "@notra/schemas/dashboard/granola";
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
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { Granola } from "@notra/ui/components/ui/svgs/granola";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import type React from "react";
import { isValidElement, useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { GRANOLA_API_KEYS_DOCS_URL } from "@/constants/granola";
import { INTEGRATION_PROVIDERS } from "@/constants/integration-analytics";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { AddGranolaIntegrationDialogProps } from "@/types/integrations";

export function AddGranolaIntegrationDialog({
  organizationId,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: AddGranolaIntegrationDialogProps) {
  const queryClient = useQueryClient();
  const displayNameId = useId();
  const apiKeyId = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const resetForm = () => {
    setDisplayName("");
    setApiKey("");
    setValidationError(null);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      return dashboardOrpc.integrations.granola.create.call({
        organizationId,
        displayName: displayName.trim(),
        apiKey: apiKey.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.granola.list.queryKey({
          input: { organizationId },
        }),
      });
      toast.success("Granola connected");
      resetForm();
      setOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to connect Granola"
      );
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (createMutation.isPending) {
        return;
      }
      resetForm();
    }
    setOpen(nextOpen);
  };

  const handleSubmit = () => {
    const parsed = addGranolaIntegrationFormSchema.safeParse({
      displayName,
      apiKey,
    });

    if (!parsed.success) {
      setValidationError(
        parsed.error.issues[0]?.message ?? "Invalid form values"
      );
      return;
    }

    setValidationError(null);
    trackEvent(POSTHOG_EVENTS.INTEGRATION_CONNECT_STARTED, {
      provider: INTEGRATION_PROVIDERS.GRANOLA,
    });
    createMutation.mutate();
  };

  const triggerElement =
    trigger && isValidElement(trigger) ? (
      <ResponsiveDialogTrigger render={trigger as React.ReactElement} />
    ) : null;

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      {triggerElement}
      <ResponsiveDialogContent className="sm:max-w-[520px]">
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-3">
            <Granola className="size-7" />
            <div>
              <ResponsiveDialogTitle className="text-xl">
                Add Granola Integration
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Connect Granola to pull meeting notes, transcripts, and AI
                summaries into your content workflows.
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor={displayNameId}>Display name</Label>
            <Input
              id={displayNameId}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="e.g. Team meeting notes"
              value={displayName}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={apiKeyId}>API key</Label>
            <Input
              autoComplete="off"
              id={apiKeyId}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="grn_..."
              type="password"
              value={apiKey}
            />
            <p className="text-muted-foreground text-sm">
              Create a key in the Granola app under Settings, then Connectors,
              then API keys.{" "}
              <a
                className="hover:text-foreground underline underline-offset-2"
                href={GRANOLA_API_KEYS_DOCS_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                View guide
              </a>
            </p>
          </div>
          {validationError ? (
            <p className="text-destructive text-sm">{validationError}</p>
          ) : null}
        </div>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose
            render={
              <Button disabled={createMutation.isPending} variant="outline" />
            }
          >
            Cancel
          </ResponsiveDialogClose>
          <Button disabled={createMutation.isPending} onClick={handleSubmit}>
            {createMutation.isPending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Verifying key
              </>
            ) : (
              "Add Integration"
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
