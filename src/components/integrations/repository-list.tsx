"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Repository, RepositoryListProps } from "@/types/integrations";
import { getOutputTypeLabel } from "@/utils/output-types";
import { QUERY_KEYS } from "@/utils/query-keys";

export function RepositoryList({ integrationId }: RepositoryListProps) {
  const queryClient = useQueryClient();

  const { data: integration, isLoading } = useQuery({
    queryKey: QUERY_KEYS.INTEGRATIONS.detail(integrationId),
    queryFn: async () => {
      const response = await fetch(
        `/api/integrations/${integrationId}?includeRepositories=true`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch repositories");
      }
      return response.json() as Promise<{
        repositories: Repository[];
      }>;
    },
  });

  const toggleOutputMutation = useMutation({
    mutationFn: async ({
      outputId,
      enabled,
    }: {
      outputId: string;
      enabled: boolean;
    }) => {
      const response = await fetch(`/api/outputs/${outputId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        throw new Error("Failed to update output");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.INTEGRATIONS.detail(integrationId),
      });
      toast.success("Content output updated");
    },
    onError: () => {
      toast.error("Failed to update content output");
    },
  });

  const repositories = integration?.repositories || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No repositories configured yet
        </CardContent>
      </Card>
    );
  }

  const repository = repositories[0];

  if (!repository) {
    return (
      <div className="text-center text-muted-foreground text-sm">
        No repository configured for this integration
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        Click to enable or disable content types for automatic generation
      </p>
      <div className="flex flex-wrap gap-2">
        {repository.outputs?.map((output) => (
          <button
            className="transition-all hover:scale-105"
            disabled={toggleOutputMutation.isPending}
            key={output.id}
            onClick={() => {
              toggleOutputMutation.mutate({
                outputId: output.id,
                enabled: !output.enabled,
              });
            }}
            type="button"
          >
            <Badge
              className="cursor-pointer"
              variant={output.enabled ? "default" : "secondary"}
            >
              {getOutputTypeLabel(output.outputType)}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
