"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { IntegrationCardProps } from "@/types/integrations";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function IntegrationCard({
  integration,
  organizationSlug,
  onUpdate,
}: IntegrationCardProps) {
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
    // biome-ignore lint: Using browser confirm for simple deletion confirmation
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
    router.push(`/${organizationSlug}/integrations/github/${integration.id}`);
  };

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={handleCardClick}
    >
      <CardHeader>
        <CardTitle>{integration.displayName}</CardTitle>
        <CardDescription>
          {integration.createdByUser ? (
            <>
              Added by {integration.createdByUser.name} on{" "}
              {new Date(integration.createdAt).toLocaleDateString()}
            </>
          ) : (
            <>
              Created on {new Date(integration.createdAt).toLocaleDateString()}
            </>
          )}
        </CardDescription>
        <CardAction>
          <div
            className="flex items-center gap-2"
            onClickCapture={(e) => e.stopPropagation()}
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
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground text-sm">
          {integration.repositories.length === 0 ? (
            <p>No repositories configured</p>
          ) : (
            <p>
              {integration.repositories.length} repository
              {integration.repositories.length !== 1 ? "ies" : ""} configured
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
