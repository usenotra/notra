"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Framer } from "@/components/ui/svgs/framer";
import { Github } from "@/components/ui/svgs/github";
import { Linear } from "@/components/ui/svgs/linear";
import { Marble } from "@/components/ui/svgs/marble";
import { Slack } from "@/components/ui/svgs/slack";
import { Webflow } from "@/components/ui/svgs/webflow";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QUERY_KEYS } from "@/utils/query-keys";

const AddIntegrationDialog = dynamic(
  () =>
    import("@/components/integrations/add-integration-dialog").then((mod) => ({
      default: mod.AddIntegrationDialog,
    })),
  { ssr: false }
);

type Integration = {
  id: string;
  displayName: string;
  type: string;
  enabled: boolean;
  createdAt: string;
  repositories: Array<{
    id: string;
    owner: string;
    repo: string;
    enabled: boolean;
  }>;
};

type PageClientProps = {
  organizationId: string;
};

type IntegrationConfig = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  available: boolean;
  category: "input" | "output";
};

const INPUT_SOURCES: readonly IntegrationConfig[] = [
  {
    id: "github",
    name: "GitHub",
    description:
      "Connect GitHub repositories for AI-powered changelogs, blog posts, and tweets",
    icon: <Github />,
    href: "github",
    available: true,
    category: "input",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Sync issues and updates from Linear for automated content",
    icon: <Linear />,
    href: "linear",
    available: false,
    category: "input",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Connect Slack workspaces to track updates and announcements",
    icon: <Slack />,
    href: "slack",
    available: false,
    category: "input",
  },
];

const OUTPUT_SOURCES: readonly IntegrationConfig[] = [
  {
    id: "framer",
    name: "Framer",
    description: "Sync content to your Framer site automatically",
    icon: <Framer />,
    href: "framer",
    available: false,
    category: "output",
  },
  {
    id: "marble",
    name: "Marble",
    description: "Publish to Marble for seamless content management",
    icon: <Marble />,
    href: "marble",
    available: false,
    category: "output",
  },
  {
    id: "webflow",
    name: "Webflow",
    description: "Publish content directly to your Webflow CMS",
    icon: <Webflow />,
    href: "webflow",
    available: false,
    category: "output",
  },
];

const ALL_INTEGRATIONS = [...INPUT_SOURCES, ...OUTPUT_SOURCES];

function IntegrationCard({
  integration,
  activeCount,
}: {
  integration: IntegrationConfig;
  activeCount: number;
}) {
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id;
  const organizationSlug = activeOrganization?.slug;
  const isActive = activeCount > 0;
  const [dialogOpen, setDialogOpen] = useState(false);
  const showManageButton = integration.available && isActive;
  const showConnectButton = integration.available && !isActive;
  const showComingSoon = !integration.available;
  const showDialog = integration.available && integration.id === "github";

  if (!(organizationId && organizationSlug)) {
    return null;
  }

  const cardContent = (
    <Card
      className={
        integration.available
          ? "cursor-pointer transition-colors hover:bg-accent/50"
          : ""
      }
    >
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-8">
            {integration.icon}
          </div>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-base">{integration.name}</CardTitle>
            <CardDescription className="text-sm">
              {integration.description}
            </CardDescription>
          </div>
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            {isActive ? (
              <Badge variant="default">{activeCount} active</Badge>
            ) : null}
            {showManageButton ? (
              <Button
                onClick={(e) => e.stopPropagation()}
                size="sm"
                variant="outline"
              >
                Manage
              </Button>
            ) : null}
            {showConnectButton ? (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDialogOpen(true);
                }}
                size="sm"
                variant="outline"
              >
                Connect
              </Button>
            ) : null}
            {showComingSoon ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      disabled
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Coming Soon
                    </Button>
                  }
                />
                <TooltipContent>Coming soon</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </CardAction>
      </CardHeader>
    </Card>
  );

  return (
    <>
      {integration.available ? (
        <Link href={`/${organizationSlug}/integrations/${integration.href}`}>
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}
      {showDialog ? (
        <AddIntegrationDialog
          onOpenChange={setDialogOpen}
          onSuccess={() => {
            setDialogOpen(false);
          }}
          open={dialogOpen}
          organizationId={organizationId}
        />
      ) : null}
    </>
  );
}

export default function PageClient({
  organizationId: propOrganizationId,
}: PageClientProps) {
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = propOrganizationId ?? activeOrganization?.id;
  const organizationSlug = activeOrganization?.slug;

  const { data: integrations, isLoading } = useQuery({
    queryKey: QUERY_KEYS.INTEGRATIONS.all(organizationId),
    queryFn: async () => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }
      const response = await fetch(
        `/api/integrations?organizationId=${organizationId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch integrations");
      }

      return response.json() as Promise<Integration[]>;
    },
    enabled: !!organizationId,
  });

  if (!organizationId) {
    return (
      <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <div className="space-y-1">
            <h1 className="font-bold text-3xl tracking-tight">Integrations</h1>
            <p className="text-muted-foreground">
              Please select an organization to view integrations
            </p>
          </div>
        </div>
      </div>
    );
  }

  const integrationsByType = integrations?.reduce(
    (acc, integration) => {
      if (!acc[integration.type]) {
        acc[integration.type] = [];
      }
      acc[integration.type].push(integration);
      return acc;
    },
    {} as Record<string, Integration[]>
  );

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">Integrations</h1>
          <p className="text-muted-foreground">
            Connect external services to automate your workflows
          </p>
        </div>

        <div className="space-y-8">
          {isLoading ? (
            <>
              <section>
                <h2 className="mb-4 font-semibold text-lg">Input Sources</h2>
                <p className="mb-4 text-muted-foreground text-sm">
                  Connect services to pull data and updates from
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <Skeleton className="size-10 shrink-0 rounded-md" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-4 w-full" />
                          </div>
                        </div>
                        <CardAction>
                          <Skeleton className="h-9 w-28 rounded-md" />
                        </CardAction>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="mb-4 font-semibold text-lg">Output Sources</h2>
                <p className="mb-4 text-muted-foreground text-sm">
                  Connect services to publish and sync content to
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <Skeleton className="size-10 shrink-0 rounded-md" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-4 w-full" />
                          </div>
                        </div>
                        <CardAction>
                          <Skeleton className="h-9 w-28 rounded-md" />
                        </CardAction>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="mb-4 font-semibold text-lg">Input Sources</h2>
                <p className="mb-4 text-muted-foreground text-sm">
                  Connect services to pull data and updates from
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {INPUT_SOURCES.map((integration) => (
                    <IntegrationCard
                      activeCount={
                        integrationsByType?.[integration.id]?.length || 0
                      }
                      integration={integration}
                      key={integration.id}
                    />
                  ))}
                </div>
              </section>

              <section>
                <h2 className="mb-4 font-semibold text-lg">Output Sources</h2>
                <p className="mb-4 text-muted-foreground text-sm">
                  Connect services to publish and sync content to
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {OUTPUT_SOURCES.map((integration) => (
                    <IntegrationCard
                      activeCount={
                        integrationsByType?.[integration.id]?.length || 0
                      }
                      integration={integration}
                      key={integration.id}
                    />
                  ))}
                </div>
              </section>
            </>
          )}

          {!isLoading && integrations && integrations.length > 0 ? (
            <section>
              <h2 className="mb-4 font-semibold text-lg">
                Active Integrations
              </h2>
              <div className="grid gap-4">
                {integrations.map((integration) => {
                  const config = ALL_INTEGRATIONS.find(
                    (i) => i.id === integration.type
                  );

                  return (
                    <Link
                      href={`/${organizationSlug}/integrations/${integration.type}/${integration.id}`}
                      key={integration.id}
                    >
                      <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                        <CardHeader>
                          <div className="flex items-start gap-4">
                            <div className="flex size-10 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-8">
                              {config?.icon}
                            </div>
                            <div className="flex-1 space-y-1">
                              <CardTitle className="text-base">
                                {integration.displayName}
                              </CardTitle>
                              <CardDescription className="text-sm">
                                {config?.name} •{" "}
                                {integration.repositories.length}{" "}
                                {integration.repositories.length === 1
                                  ? "repository"
                                  : "repositories"}
                              </CardDescription>
                            </div>
                          </div>
                          <CardAction>
                            <Badge
                              variant={
                                integration.enabled ? "default" : "secondary"
                              }
                            >
                              {integration.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </CardAction>
                        </CardHeader>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
