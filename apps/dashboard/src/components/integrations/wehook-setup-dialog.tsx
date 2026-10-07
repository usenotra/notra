"use client";

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
import { CopyButton } from "@notra/ui/components/ui/copy-button";
import { Input } from "@notra/ui/components/ui/input";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { isValidElement, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { WebhookSetupDialogProps } from "@/types/integrations";
import type { WebhookConfig } from "@/types/services/integrations";
import { toastCopyError } from "@/utils/copy-to-clipboard";
import { isNotFoundError } from "@/utils/orpc-errors";

function WebhookCopyButton({ value, label }: { value: string; label: string }) {
  const t = useTranslations("integrations.webhookSetup");
  const tCommon = useTranslations("common");

  return (
    <CopyButton
      aria-label={tCommon("labels.copyLabel", { label })}
      copiedAriaLabel={tCommon("labels.labelCopied", { label })}
      onCopy={() => toast.success(t("copied", { label }))}
      onCopyError={toastCopyError}
      size="icon"
      value={value}
      variant="outline"
    />
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
  const t = useTranslations("integrations.webhookSetup");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");
  const [internalOpen, setInternalOpen] = useState(false);
  const [secretRevealed, setSecretRevealed] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const queryClient = useQueryClient();

  const {
    data: webhookConfig,
    isLoading: loadingConfig,
    isFetched,
  } = useQuery<WebhookConfig | null>({
    queryKey: dashboardOrpc.integrations.repositories.webhook.get.queryKey({
      input: { organizationId, repositoryId },
    }),
    queryFn: async () => {
      try {
        return await dashboardOrpc.integrations.repositories.webhook.get.call({
          organizationId,
          repositoryId,
        });
      } catch (error) {
        if (isNotFoundError(error)) {
          return null;
        }
        throw error;
      }
    },
    enabled: open,
    retry: false,
  });

  const generateMutation = useMutation<WebhookConfig, Error, void>({
    mutationFn: async () => {
      return dashboardOrpc.integrations.repositories.webhook.generateSecret.call(
        {
          organizationId,
          repositoryId,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.repositories.webhook.get.queryKey({
          input: { organizationId, repositoryId },
        }),
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

  let triggerElement = null;
  if (trigger !== undefined && isValidElement(trigger)) {
    triggerElement = (
      <ResponsiveDialogTrigger render={trigger as React.ReactElement} />
    );
  } else if (trigger !== undefined) {
    triggerElement = (
      <ResponsiveDialogTrigger>
        <Button size="sm" variant="outline">
          {t("title")}
        </Button>
      </ResponsiveDialogTrigger>
    );
  }

  return (
    <ResponsiveDialog onOpenChange={setOpen} open={open}>
      {triggerElement}
      <ResponsiveDialogContent className="overflow-hidden sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="text-2xl">
            {t("title")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t.rich("description", {
              link: (chunks) => (
                <a
                  className="text-primary hover:underline"
                  href={githubWebhooksUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {chunks}
                </a>
              ),
            })}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

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
          ) : null}
          {!(loadingConfig || isPending) && webhookConfig ? (
            <>
              <fieldset className="space-y-1.5">
                <p className="text-sm font-medium">
                  {tIntegrationsShared("payloadUrl")}
                </p>
                <div className="flex gap-2">
                  <Input
                    className="font-mono text-xs"
                    readOnly
                    value={webhookConfig.webhookUrl}
                  />
                  <WebhookCopyButton
                    label={tCommon("labels.url")}
                    value={webhookConfig.webhookUrl}
                  />
                </div>
              </fieldset>

              <fieldset className="space-y-1.5">
                <p className="text-sm font-medium">
                  {tCommon("labels.contentType")}
                </p>
                <Input className="text-xs" disabled value="application/json" />
              </fieldset>

              <fieldset className="space-y-1.5">
                <p className="text-sm font-medium">
                  {tIntegrationsShared("secret")}
                </p>
                <div className="flex gap-2">
                  <Input
                    className="font-mono text-xs"
                    onBlur={() => setSecretRevealed(false)}
                    onFocus={() => setSecretRevealed(true)}
                    readOnly
                    type={secretRevealed ? "text" : "password"}
                    value={webhookConfig.webhookSecret}
                  />
                  <WebhookCopyButton
                    label={tIntegrationsShared("secret")}
                    value={webhookConfig.webhookSecret}
                  />
                </div>
              </fieldset>
            </>
          ) : null}
          {!(loadingConfig || isPending) && !webhookConfig ? (
            <div className="space-y-4">
              <div className="border-destructive/50 bg-destructive/10 rounded-md border p-4 text-center">
                <p className="text-destructive text-sm font-medium">
                  {t("loadFailed")}
                </p>
                {generateMutation.error ? (
                  <p className="text-muted-foreground mt-1 text-xs">
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
                {tCommon("actions.retry")}
              </Button>
            </div>
          ) : null}
        </div>

        <ResponsiveDialogFooter className="gap-2">
          <ResponsiveDialogClose render={<Button variant="outline" />}>
            {t("skip")}
          </ResponsiveDialogClose>
          <Button
            disabled={!webhookConfig}
            onClick={() => setOpen(false)}
            type="button"
          >
            {t("confirm")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
