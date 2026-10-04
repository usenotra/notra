"use client";

import { Input } from "@notra/ui/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { GitHubWebhookRotationDialog } from "@/components/integrations/github/github-webhook-rotation-dialog";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { GitHubWebhookSettingsProps } from "@/types/integrations/github";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
import { isNotFoundError } from "@/utils/orpc-errors";

export function GitHubWebhookSettings({
  repository,
  organizationId,
}: GitHubWebhookSettingsProps) {
  const t = useTranslations("integrations.github.webhookSettings");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const urlId = useId();
  const secretId = useId();
  const [revealed, setRevealed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const input = { organizationId, repositoryId: repository.id };
  const config = useQuery({
    ...dashboardOrpc.integrations.repositories.webhook.get.queryOptions({
      input,
    }),
    retry: false,
  });
  const generate = useMutation({
    mutationFn: () =>
      dashboardOrpc.integrations.repositories.webhook.generateSecret.call(
        input
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.repositories.webhook.get.queryKey({
          input,
        }),
      });
      toast.success(t("secretGenerated"));
    },
    onError: (error) => toast.error(error.message),
  });

  if (config.isPending) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        {t("loading")}
      </p>
    );
  }
  if (!config.data) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p
          className="text-muted-foreground text-sm"
          role={config.isError ? "alert" : undefined}
        >
          {config.error && !isNotFoundError(config.error)
            ? config.error.message
            : t("notConfigured")}
        </p>
        {isNotFoundError(config.error) || !config.isError ? (
          <Button
            size="sm"
            variant="outline"
            disabled={generate.isPending}
            onClick={() => generate.mutate()}
          >
            {t("generate")}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => config.refetch()}>
            {tCommon("actions.retry")}
          </Button>
        )}
      </div>
    );
  }

  const webhook = config.data;
  return (
    <div className="max-w-3xl space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor={urlId}>
          {tIntegrationsShared("payloadUrl")}
        </label>
        <div className="flex gap-2">
          <Input
            id={urlId}
            readOnly
            value={webhook.webhookUrl}
            className="min-w-0 font-mono text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              copyTextToClipboard(webhook.webhookUrl, t("urlCopied"))
            }
          >
            {tCommon("labels.copyUrl")}
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor={secretId}>
          {tIntegrationsShared("secret")}
        </label>
        <div className="flex flex-wrap gap-2">
          <Input
            id={secretId}
            readOnly
            type={revealed ? "text" : "password"}
            value={webhook.webhookSecret}
            className="min-w-0 flex-1 font-mono text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            aria-pressed={revealed}
            onClick={() => setRevealed(!revealed)}
          >
            {revealed ? t("hide") : t("show")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              copyTextToClipboard(webhook.webhookSecret, t("secretCopied"))
            }
          >
            {t("copySecret")}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={generate.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          {tIntegrationsShared("regenerateSecret")}
        </Button>
        <a
          className="text-sm underline underline-offset-4"
          href={`https://github.com/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/settings/hooks`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("openGitHub")}
        </a>
      </div>
      <GitHubWebhookRotationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        isPending={generate.isPending}
        onConfirm={() =>
          generate.mutate(undefined, { onSuccess: () => setConfirmOpen(false) })
        }
      />
    </div>
  );
}
