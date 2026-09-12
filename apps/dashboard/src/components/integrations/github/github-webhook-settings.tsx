"use client";

import { Input } from "@notra/ui/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { GitHubWebhookRotationDialog } from "@/components/integrations/github/github-webhook-rotation-dialog";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { GitHubWebhookSettingsProps } from "@/types/integrations/github";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";

export function GitHubWebhookSettings({
  repository,
  organizationId,
}: GitHubWebhookSettingsProps) {
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
      toast.success("Webhook secret generated. Update it in GitHub.");
    },
    onError: (error) => toast.error(error.message),
  });

  if (config.isPending) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        Loading webhook settings…
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
          {config.error?.message ?? "No webhook configured."}
        </p>
        {config.error?.message === "Webhook not configured" ||
        !config.isError ? (
          <Button
            size="sm"
            variant="outline"
            disabled={generate.isPending}
            onClick={() => generate.mutate()}
          >
            Generate webhook secret
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => config.refetch()}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  const webhook = config.data;
  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-muted-foreground text-sm">
        Use these values in your GitHub webhook settings. Set the content type
        to <code>application/json</code>.
      </p>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor={urlId}>
          Payload URL
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
              copyTextToClipboard(webhook.webhookUrl, "Webhook URL copied")
            }
          >
            Copy URL
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor={secretId}>
          Secret
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
            {revealed ? "Hide" : "Show"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              copyTextToClipboard(
                webhook.webhookSecret,
                "Webhook secret copied"
              )
            }
          >
            Copy secret
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
          Regenerate secret
        </Button>
        <span className="text-muted-foreground text-xs">
          Replace the old secret in GitHub after regenerating.
        </span>
        <a
          className="text-sm underline underline-offset-4"
          href={`https://github.com/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/settings/hooks`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open GitHub webhooks
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
