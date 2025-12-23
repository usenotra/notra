"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
import { QUERY_KEYS } from "@/utils/query-keys";

export function IntegrationCard({
  integration,
  organizationSlug,
  onUpdate,
}: IntegrationCardProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch(`/api/integrations/${integration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        throw new Error("Failed to update integration");
      }

      return response.json();
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.INTEGRATIONS.base,
      });
      toast.success(enabled ? "Integration enabled" : "Integration disabled");
      onUpdate?.();
    },
    onError: () => {
      toast.error("Failed to update integration");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/integrations/${integration.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete integration");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.INTEGRATIONS.base,
      });
      toast.success("Integration deleted");
      onUpdate?.();
    },
    onError: () => {
      toast.error("Failed to delete integration");
    },
  });

  const handleToggle = () => {
    toggleMutation.mutate(!integration.enabled);
  };

  const handleDelete = () => {
    // biome-ignore lint: Using browser confirm for simple deletion confirmation
    if (!window.confirm("Are you sure you want to delete this integration?")) {
      return;
    }
    deleteMutation.mutate();
  };

  const isLoading = toggleMutation.isPending || deleteMutation.isPending;

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
            onClick={(e) => e.stopPropagation()}
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
