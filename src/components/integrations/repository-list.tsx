"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RepositoryListProps } from "@/types/integrations";
import { getOutputTypeLabel } from "@/utils/output-types";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function RepositoryList({ integrationId }: RepositoryListProps) {
  const [isToggling, setIsToggling] = useState(false);

  const integration = useQuery(
    api.integrations.get,
    integrationId
      ? { integrationId: integrationId as Id<"githubIntegrations"> }
      : "skip"
  );

  const toggleOutput = useMutation(api.outputs.toggle);

  const repositories = integration?.repositories || [];
  const isLoading = integration === undefined;

  const handleToggleOutput = async (outputId: string, enabled: boolean) => {
    setIsToggling(true);
    try {
      await toggleOutput({
        outputId: outputId as Id<"repositoryOutputs">,
        enabled: !enabled,
      });
      toast.success("Content output updated");
    } catch {
      toast.error("Failed to update content output");
    } finally {
      setIsToggling(false);
    }
  };

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
            disabled={isToggling}
            key={output._id}
            onClick={() => {
              handleToggleOutput(output._id, output.enabled);
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
