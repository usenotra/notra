"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import type React from "react";
import { isValidElement, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { WebhookConfig, WebhookSetupDialogProps } from "@/types/integrations";
import { QUERY_KEYS } from "@/utils/query-keys";

const RECOMMENDED_EVENTS = [
  { name: "Releases", event: "release", description: "Triggered when a release is published, unpublished, created, edited, deleted, or prereleased" },
  { name: "Push", event: "push", description: "Triggered on any push to a repository" },
  { name: "Pull requests", event: "pull_request", description: "Triggered when a pull request is opened, closed, merged, or edited" },
];

function CopyableField({
  label,
  value,
  description,
  isSensitive = false,
}: {
  label: string;
  value: string;
  description?: string;
  isSensitive?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayValue = isSensitive && !revealed ? "••••••••••••••••••••••••••••••••" : value;

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2">
        <Input
          className="font-mono text-xs"
          readOnly
          type={isSensitive && !revealed ? "password" : "text"}
          value={displayValue}
        />
        {isSensitive ? (
          <Button
            onClick={() => setRevealed(!revealed)}
            size="icon"
            type="button"
            variant="outline"
          >
            {revealed ? (
              <svg className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <title>Hide</title>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" x2="23" y1="1" y2="23" />
              </svg>
            ) : (
              <svg className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <title>Show</title>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </Button>
        ) : null}
        <Button
          onClick={handleCopy}
          size="icon"
          type="button"
          variant="outline"
        >
          {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
        </Button>
      </div>
      {description ? (
        <p className="mt-1 text-muted-foreground text-xs">{description}</p>
      ) : null}
    </Field>
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
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const queryClient = useQueryClient();

  const { data: webhookConfig, isLoading: loadingConfig } = useQuery({
    queryKey: QUERY_KEYS.INTEGRATIONS.webhookConfig(repositoryId),
    queryFn: async () => {
      const response = await fetch(
        `/api/organizations/${organizationId}/repositories/${repositoryId}/webhook`
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
        }
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
      toast.success("Webhook secret generated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

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
      <AlertDialogContent className="sm:max-w-[600px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">
            Setup GitHub Webhook
          </AlertDialogTitle>
          <AlertDialogDescription>
            Configure a webhook in your GitHub repository to receive automatic notifications for releases, commits, and other events.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6 py-4">
          {loadingConfig ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : webhookConfig ? (
            <>
              <CopyableField
                description="Add this URL as the Payload URL in your GitHub webhook settings"
                label="Webhook URL"
                value={webhookConfig.webhookUrl}
              />
              <CopyableField
                description="Use this as the Secret in your GitHub webhook settings"
                isSensitive
                label="Webhook Secret"
                value={webhookConfig.webhookSecret}
              />
              <div className="space-y-3">
                <p className="font-medium text-sm">Recommended Events</p>
                <p className="text-muted-foreground text-xs">
                  Select these events when configuring your webhook in GitHub:
                </p>
                <ul className="space-y-2">
                  {RECOMMENDED_EVENTS.map((item) => (
                    <li
                      className="flex items-start gap-2 rounded-md border p-3"
                      key={item.event}
                    >
                      <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                        <CheckIcon className="size-3 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                <p className="font-medium text-blue-900 text-sm dark:text-blue-100">
                  Next Steps
                </p>
                <ol className="mt-2 list-inside list-decimal space-y-1 text-blue-800 text-xs dark:text-blue-200">
                  <li>Go to your GitHub repository webhook settings</li>
                  <li>Click "Add webhook"</li>
                  <li>Paste the Payload URL and Secret from above</li>
                  <li>Select "application/json" as the content type</li>
                  <li>Choose the events you want to trigger (or select the recommended ones above)</li>
                  <li>Click "Add webhook" to save</li>
                </ol>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-dashed p-8 text-center">
                <p className="text-muted-foreground text-sm">
                  No webhook secret has been generated yet. Click the button below to generate one.
                </p>
              </div>
              <Button
                className="w-full"
                disabled={generateMutation.isPending}
                onClick={() => generateMutation.mutate()}
                type="button"
              >
                {generateMutation.isPending ? "Generating..." : "Generate Webhook Secret"}
              </Button>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          {webhookConfig ? (
            <a
              className="inline-flex shrink-0 cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-lg border border-transparent bg-primary px-2.5 font-medium text-primary-foreground text-sm outline-none transition-all duration-150 ease-out hover:bg-primary/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.97] h-8 gap-1.5"
              href={githubWebhooksUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ExternalLinkIcon className="size-4" />
              Open GitHub Settings
            </a>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
