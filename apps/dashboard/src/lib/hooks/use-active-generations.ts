"use client";

import type {
  ActiveGeneration,
  GenerationResult,
} from "@notra/geo-core/types/generation-tracking";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { hasShownToast, markToastShown } from "@/utils/toast-dedupe";

import { dashboardOrpc } from "../orpc/query";

const ACTIVE_POLL_INTERVAL = 3000;

interface ActiveGenerationsResponse {
  generations: ActiveGeneration[];
  results: GenerationResult[];
}

export function useActiveGenerations(organizationId: string) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();
  const previousCountRef = useRef<number | null>(null);
  const slug = pathname.split("/").filter(Boolean)[0];
  const logsPath = slug ? `/${slug}/settings/logs` : "/settings/logs";

  const query = useQuery<ActiveGenerationsResponse>(
    dashboardOrpc.content.activeGenerations.list.queryOptions({
      input: { organizationId },
      enabled: !!organizationId,
      meta: { errorMessage: "Failed to load active generations" },
      refetchInterval: (query) => {
        const data = query.state.data;
        // Nothing generating: stop polling until a mutation invalidates this query.
        if (!data || data.generations.length === 0) {
          return false;
        }
        return ACTIVE_POLL_INTERVAL;
      },
      refetchIntervalInBackground: false,
    })
  );

  const clearResult = useMutation(
    dashboardOrpc.content.activeGenerations.clearCompleted.mutationOptions()
  );

  useEffect(() => {
    const generations = query.data?.generations ?? [];
    const currentCount = generations.length;
    const previousCount = previousCountRef.current;

    if (previousCount !== null && previousCount > 0 && currentCount === 0) {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.content.list.key(),
      });
    }

    previousCountRef.current = currentCount;
  }, [query.data?.generations?.length, queryClient, query.data?.generations]);

  const clearResultMutate = clearResult.mutate;

  const processResults = useCallback(
    (results: GenerationResult[]) => {
      for (const result of results) {
        const toastKey = `generation-result:${result.runId}`;

        if (hasShownToast(toastKey)) {
          continue;
        }

        markToastShown(toastKey);

        if (result.status === "success") {
          toast.success(
            result.title ? `"${result.title}" generated` : "Content generated",
            { id: result.runId }
          );
        } else if (result.status === "skipped") {
          toast.info("Content generation skipped", {
            id: result.runId,
            action: {
              label: "View logs",
              onClick: () => router.push(logsPath),
            },
          });
        } else {
          toast.error("Content generation failed", {
            id: result.runId,
            action: {
              label: "View logs",
              onClick: () => router.push(logsPath),
            },
          });
        }

        clearResultMutate({
          organizationId,
          runId: result.runId,
        });
      }
    },
    [clearResultMutate, logsPath, organizationId, router]
  );

  useEffect(() => {
    const results = query.data?.results ?? [];
    if (results.length > 0) {
      processResults(results);
    }
  }, [processResults, query.data?.results]);

  return {
    ...query,
    data: query.data?.generations,
  };
}
