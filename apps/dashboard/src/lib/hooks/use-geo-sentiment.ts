"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";

import { dashboardOrpc } from "../orpc/query";
import { useGeoRange } from "./use-geo-range";

export function useGeoSentiment(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const range = useGeoRange();
  return useQuery({
    ...dashboardOrpc.geo.sentiment.queryOptions({
      input: { organizationId, projectId, ...range.query },
    }),
    enabled: !!organizationId,
  });
}

export function useGeoSentimentAnalysis(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const range = useGeoRange();
  const client = useQueryClient();
  const input = { organizationId, projectId, ...range.query };
  const options = dashboardOrpc.geo.sentimentAnalysis.queryOptions({ input });
  const query = useQuery({
    ...options,
    enabled: !!organizationId,
    refetchInterval: (state) =>
      state.state.data?.status === "pending" ? 3000 : false,
  });
  const mutation = useMutation({
    ...dashboardOrpc.geo.analyzeSentiment.mutationOptions(),
    onSuccess: async (_data, variables) => {
      await client.invalidateQueries({
        queryKey: dashboardOrpc.geo.sentimentAnalysis.queryOptions({
          input: variables,
        }).queryKey,
      });
    },
  });
  const isAnalyzing =
    mutation.isPending &&
    JSON.stringify(mutation.variables) === JSON.stringify(input);
  return {
    scopeKey: JSON.stringify(input),
    query,
    isAnalyzing,
    analyze: () => mutation.mutate(input),
    mutationError:
      mutation.isError &&
      JSON.stringify(mutation.variables) === JSON.stringify(input),
  };
}
