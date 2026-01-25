"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@notra/ui/components/ui/alert-dialog";
import { Button } from "@notra/ui/components/ui/button";
import { Input } from "@notra/ui/components/ui/input";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react";
import type React from "react";
import { isValidElement, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  WebhookConfig,
  WebhookSetupDialogProps,
} from "@/types/integrations";
import { QUERY_KEYS } from "@/utils/query-keys";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!navigator.clipboard) {
      toast.error("Clipboard not supported");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Button
      onClick={handleCopy}
      size="icon"
      type="button"
      variant="outline"
      className="shrink-0"
    >
      {copied ? (
        <CheckIcon className="size-4" />
      ) : (
        <CopyIcon className="size-4" />
      )}
    </Button>
  );
}

export function WebhookSetupDialog({
  repositoryId,
  organizationId,
  owner,
  repo,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: WebhookSetupDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [secretRevealed, setSecretRevealed] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const queryClient = useQueryClient();

  const {
    data: webhookConfig,
    isLoading: loadingConfig,
    isFetched,
  } = useQuery({
    queryKey: QUERY_KEYS.INTEGRATIONS.webhookConfig(repositoryId),
    queryFn: async () => {
      const response = await fetch(
        `/api/organizations/${organizationId}/repositories/${repositoryId}/webhook`,
      );
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch webhook config");
      }
      return response.json() as Promise<WebhookConfig>;
    },
    enabled: open,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/organizations/${organizationId}/repositories/${repositoryId}/webhook`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate webhook secret");
      }
      return response.json() as Promise<WebhookConfig>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.INTEGRATIONS.webhookConfig(repositoryId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Auto-generate webhook secret when dialog opens and no config exists
  const { isPending, isSuccess, isError, mutate } = generateMutation;
  useEffect(() => {
    if (
      open &&
      isFetched &&
      !webhookConfig &&
      !isPending &&
      !isSuccess &&
      !isError
    ) {
      mutate();
    }
  }, [open, isFetched, webhookConfig, isPending, isSuccess, isError, mutate]);

  const githubWebhooksUrl = `https://github.com/${owner}/${repo}/settings/hooks/new`;

  const triggerElement =
    trigger !== undefined && isValidElement(trigger) ? (
      <AlertDialogTrigger render={trigger as React.ReactElement} />
    ) : trigger === undefined ? null : (
      <AlertDialogTrigger>
        <Button size="sm" variant="outline">
          Setup Webhook
        </Button>
      </AlertDialogTrigger>
    );

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      {triggerElement}
      <AlertDialogContent className="sm:max-w-md overflow-hidden">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">
            Setup Webhook
          </AlertDialogTitle>
          <AlertDialogDescription>
            Add these values in GitHub, then confirm once saved.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {loadingConfig || isPending ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ) : webhookConfig ? (
            <>
              <fieldset className="space-y-1.5">
                <p className="font-medium text-sm">Payload URL</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={webhookConfig.webhookUrl}
                    className="font-mono text-xs"
                  />
                  <CopyButton value={webhookConfig.webhookUrl} label="URL" />
                </div>
              </fieldset>

              <fieldset className="space-y-1.5">
                <p className="font-medium text-sm">Secret</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    type={secretRevealed ? "text" : "password"}
                    value={webhookConfig.webhookSecret}
                    className="font-mono text-xs"
                  />
                  <Button
                    onClick={() => setSecretRevealed(!secretRevealed)}
                    size="icon"
                    type="button"
                    variant="outline"
                    className="shrink-0"
                  >
                    {secretRevealed ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </Button>
                  <CopyButton
                    value={webhookConfig.webhookSecret}
                    label="Secret"
                  />
                </div>
              </fieldset>

              <p className="text-muted-foreground text-xs">
                Set content type to{" "}
                <span className="rounded bg-muted px-1 text-[11px]">
                  application/json
                </span>
                .{" "}
                <a
                  className="text-primary text-xs hover:underline"
                  href={githubWebhooksUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Open GitHub settings
                </a>
                .
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-center">
                <p className="font-medium text-destructive text-sm">
                  Failed to load webhook configuration
                </p>
                {generateMutation.error ? (
                  <p className="mt-1 text-muted-foreground text-xs">
                    {generateMutation.error.message}
                  </p>
                ) : null}
              </div>
              <Button
                className="w-full"
                disabled={isPending}
                onClick={() => mutate()}
                type="button"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          )}
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="h-9">Skip for now</AlertDialogCancel>
          <Button
            disabled={!webhookConfig}
            className="h-9"
            onClick={() => setOpen(false)}
            type="button"
          >
            I've added the webhook
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
