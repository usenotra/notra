"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { TitleCard } from "@/components/title-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export interface InstalledIntegration {
  id: string;
  displayName: string;
  type: string;
  enabled: boolean;
  createdAt: Date;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  repositories: Array<{
    id: string;
    owner: string;
    repo: string;
    enabled: boolean;
  }>;
}

export interface InstalledIntegrationCardProps {
  integration: InstalledIntegration;
  organizationId: string;
  organizationSlug: string;
  icon?: React.ReactNode;
  accentColor?: string;
  onUpdate?: () => void;
}

export function InstalledIntegrationCard({
  integration,
  organizationId: _organizationId,
  organizationSlug,
  icon,
  accentColor,
  onUpdate,
}: InstalledIntegrationCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const updateIntegration = useMutation(api.integrations.update);
  const removeIntegration = useMutation(api.integrations.remove);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      await updateIntegration({
        integrationId: integration.id as Id<"githubIntegrations">,
        enabled: !integration.enabled,
      });
      toast.success(
        integration.enabled ? "Integration disabled" : "Integration enabled"
      );
      onUpdate?.();
    } catch {
      toast.error("Failed to update integration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    // biome-ignore lint/suspicious/noAlert: Using browser confirm for simple deletion confirmation
    if (!window.confirm("Are you sure you want to delete this integration?")) {
      return;
    }
    setIsLoading(true);
    try {
      await removeIntegration({
        integrationId: integration.id as Id<"githubIntegrations">,
      });
      toast.success("Integration deleted");
      onUpdate?.();
    } catch {
      toast.error("Failed to delete integration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = () => {
    router.push(
      `/${organizationSlug}/integrations/${integration.type}/${integration.id}`
    );
  };

  const repositoryCount = integration.repositories.length;
  const repositoryText =
    repositoryCount === 0
      ? "No repositories"
      : `${repositoryCount} ${repositoryCount === 1 ? "repository" : "repositories"}`;

  return (
    <TitleCard
      accentColor={accentColor}
      action={
        // biome-ignore lint/a11y/noStaticElementInteractions: Container for dropdown, needs to stop propagation
        <div
          className="flex items-center gap-1.5 sm:gap-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <Badge variant={integration.enabled ? "default" : "secondary"}>
            {integration.enabled ? "Enabled" : "Disabled"}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button disabled={isLoading} size="icon-sm" variant="ghost">
                  <svg
                    aria-label="More options"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <title>More options</title>
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleToggle}>
                {integration.enabled ? "Disable" : "Enable"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleDelete}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
      className="cursor-pointer transition-colors hover:bg-muted/80"
      heading={integration.displayName}
      icon={icon}
      onClick={handleCardClick}
    >
      <p className="text-muted-foreground text-sm">{repositoryText}</p>
    </TitleCard>
  );
}
