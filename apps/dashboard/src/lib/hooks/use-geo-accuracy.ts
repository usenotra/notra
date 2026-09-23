"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { accuracyAnalysisInterval } from "@/utils/geo-accuracy";

import { dashboardOrpc } from "../orpc/query";
import { useGeoRange } from "./use-geo-range";

export function useGeoAccuracyAnalysis(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const range = useGeoRange();
  const client = useQueryClient();
  const input = { organizationId, projectId, ...range.query };
  const options = dashboardOrpc.geo.accuracyAnalysis.queryOptions({ input });
  const query = useQuery({
    ...options,
    enabled: !!organizationId,
    refetchInterval: (state) => accuracyAnalysisInterval(state.state.data),
  });
  const analyze = useMutation({
    ...dashboardOrpc.geo.analyzeAccuracy.mutationOptions(),
    onSuccess: async (_data, variables) => {
      await client.invalidateQueries({
        queryKey: dashboardOrpc.geo.accuracyAnalysis.queryOptions({
          input: variables,
        }).queryKey,
      });
    },
  });
  const isAnalyzing =
    analyze.isPending &&
    JSON.stringify(analyze.variables) === JSON.stringify(input);
  return {
    scopeKey: JSON.stringify(input),
    query,
    isAnalyzing,
    analyze: () => analyze.mutate(input),
    mutationError:
      analyze.isError &&
      JSON.stringify(analyze.variables) === JSON.stringify(input),
    projectId,
  };
}
