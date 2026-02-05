"use client";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { GitHubIntegrationDetailSkeleton } from "./skeleton";
import { Badge } from "@notra/ui/components/ui/badge";
import { Button } from "@notra/ui/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import { Input } from "@notra/ui/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, CopyIcon } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";
import type { GitHubIntegration, GitHubRepository } from "@/types/integrations";
import type { Trigger } from "@/types/triggers";
import { getOutputTypeLabel } from "@/utils/output-types";
import { QUERY_KEYS } from "@/utils/query-keys";

const EditIntegrationDialog = dynamic(
  () =>
    import("@/components/integrations/edit-integration-dialog").then((mod) => ({
      default: mod.EditIntegrationDialog,
    })),
  { ssr: false },
);

const WebhookSetupDialog = dynamic(
  () =>
    import("@/components/integrations/wehook-setup-dialog").then((mod) => ({
      default: mod.WebhookSetupDialog,
    })),
  { ssr: false },
);

interface PageClientProps {
  integrationId: string;
}

function buildWebhookUrl(
  organizationId: string,
  integrationId: string,
  repositoryId: string,
): string {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/webhooks/github/${organizationId}/${integrationId}/${repositoryId}`;
}

function CopyableWebhookUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!navigator.clipboard) {
      toast.error("Clipboard not supported");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Webhook URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="flex gap-2">
      <Input className="font-mono text-xs" readOnly value={url} />
      <Button onClick={handleCopy} size="icon" type="button" variant="outline">
        {copied ? (
          <CheckIcon className="size-4" />
        ) : (
          <CopyIcon className="size-4" />
        )}
      </Button>
    </div>
  );
}

function WebhookDebugEntry({
  repo,
  organizationId,
  integrationId,
}: {
  repo: GitHubRepository;
  organizationId: string;
  integrationId: string;
}) {
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const webhookUrl = buildWebhookUrl(organizationId, integrationId, repo.id);

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">
          {repo.owner}/{repo.repo}
        </p>
        <Button
          onClick={() => setWebhookDialogOpen(true)}
          size="sm"
          variant="outline"
        >
          Setup Webhook
        </Button>
      </div>
      <CopyableWebhookUrl url={webhookUrl} />
      <WebhookSetupDialog
        onOpenChange={setWebhookDialogOpen}
        open={webhookDialogOpen}
        organizationId={organizationId}
        owner={repo.owner}
        repo={repo.repo}
        repositoryId={repo.id}
      />
    </div>
  );
}

function formatFrequency(cron?: Trigger["sourceConfig"]["cron"]) {
  if (!cron) return "Not set";
  const time = `${String(cron.hour).padStart(2, "0")}:${String(cron.minute).padStart(2, "0")} UTC`;
  if (cron.frequency === "weekly") {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `Weekly - ${days[cron.dayOfWeek ?? 0]} @ ${time}`;
  }
  if (cron.frequency === "monthly") {
    return `Monthly - Day ${cron.dayOfMonth} @ ${time}`;
  }
  return `Daily @ ${time}`;
}

function SchedulesSection({
  organizationId,
  slug,
}: {
  organizationId: string;
  slug: string;
}) {
  const { data, isPending } = useQuery({
    queryKey: QUERY_KEYS.AUTOMATION.schedules(organizationId),
    queryFn: async () => {
      const response = await fetch(
        `/api/organizations/${organizationId}/automation/schedules`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch schedules");
      }
      return response.json() as Promise<{ triggers: Trigger[] }>;
    },
    enabled: !!organizationId,
  });

  const schedules = data?.triggers ?? [];
  const displaySchedules = schedules.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-semibold text-lg">Schedules</h2>
          <p className="text-muted-foreground text-sm">
            Automated content generation on a recurring basis.
          </p>
        </div>
        <Link href={`/${slug}/automation/schedule`}>
          <Button size="sm" variant="outline">
            View all
            <ArrowRightIcon className="ml-1 size-3.5" />
          </Button>
        </Link>
      </div>
      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg border bg-muted/30" />
          ))}
        </div>
      ) : displaySchedules.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          No schedules configured yet.
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {displaySchedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="truncate text-sm font-medium">
                  {getOutputTypeLabel(schedule.outputType)}
                </span>
                <span className="shrink-0 text-muted-foreground text-xs">
                  {formatFrequency(schedule.sourceConfig.cron)}
                </span>
              </div>
              <Badge variant={schedule.enabled ? "default" : "secondary"}>
                {schedule.enabled ? "Active" : "Paused"}
              </Badge>
            </div>
          ))}
          {schedules.length > 5 && (
            <div className="px-4 py-2 text-center">
              <Link
                href={`/${slug}/automation/schedule`}
                className="text-muted-foreground text-xs hover:underline"
              >
                +{schedules.length - 5} more schedules
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PageClient({ integrationId }: PageClientProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id;

  const { data: integration, isPending } = useQuery({
    queryKey: QUERY_KEYS.INTEGRATIONS.detail(integrationId),
    queryFn: async () => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }
      const response = await fetch(
        `/api/organizations/${organizationId}/integrations/${integrationId}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch integration");
      }

      return response.json() as Promise<GitHubIntegration>;
    },
    enabled: !!organizationId,
  });

  if (isPending) {
    return <GitHubIntegrationDetailSkeleton />;
  }

  if (!integration) {
    return (
      <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <div className="rounded-xl border border-dashed p-12 text-center">
            <h3 className="font-medium text-lg">Integration not found</h3>
            <p className="text-muted-foreground text-sm">
              This integration may have been deleted or you don't have access to
              it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-bold text-3xl tracking-tight">
              {integration.displayName}
            </h1>
            <p className="text-muted-foreground">
              Configure your GitHub integration and manage repositories
            </p>
          </div>
          <Button
            onClick={() => setEditDialogOpen(true)}
            size="sm"
            variant="outline"
          >
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>Edit icon</title>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span className="ml-2">Edit</span>
          </Button>
        </div>

        <EditIntegrationDialog
          integration={integration}
          onOpenChange={setEditDialogOpen}
          open={editDialogOpen}
          organizationId={organizationId ?? ""}
        />

        <div className="space-y-6">
          <div className="rounded-lg border p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h2 className="font-semibold text-lg">Integration Details</h2>
                <p className="text-muted-foreground text-sm">
                  {integration.createdByUser ? (
                    <>
                      Added by {integration.createdByUser.name} on{" "}
                      {new Date(integration.createdAt).toLocaleDateString()}
                    </>
                  ) : (
                    <>
                      Created on{" "}
                      {new Date(integration.createdAt).toLocaleDateString()}
                    </>
                  )}
                </p>
              </div>
              <Badge variant={integration.enabled ? "default" : "secondary"}>
                {integration.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>

          <SchedulesSection organizationId={organizationId ?? ""} slug={activeOrganization?.slug ?? ""} />

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg">Events</h2>
              <Badge variant="secondary">Coming soon</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              React to repository events like releases, pushes, and stars.
            </p>
            <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
              Event-based triggers are coming soon.
            </div>
          </div>

          {process.env.NODE_ENV !== "production" && organizationId && integration.repositories.length > 0 ? (
            <Collapsible className="space-y-4">
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg">Developer Tools</h2>
                  <Badge variant="secondary">Debug</Badge>
                </div>
                <ChevronDownIcon className="size-5 transition-transform [[data-panel-open]_&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-4 rounded-lg border p-6">
                  <div>
                    <h3 className="mb-2 font-medium text-sm">Webhook URLs</h3>
                    <p className="mb-4 text-muted-foreground text-xs">
                      Use these URLs to configure webhooks in your GitHub
                      repository settings. Each repository has a unique webhook
                      endpoint. Click "Setup Webhook" to generate a secret and
                      see configuration instructions.
                    </p>
                  </div>
                  <div className="space-y-4">
                    {integration.repositories.map((repo) => (
                      <WebhookDebugEntry
                        integrationId={integrationId}
                        key={repo.id}
                        organizationId={organizationId}
                        repo={repo}
                      />
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </div>
      </div>
    </div>
  );
}
