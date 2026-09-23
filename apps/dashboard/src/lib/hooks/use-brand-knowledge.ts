"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardOrpc } from "../orpc/query";

export function useBrandKnowledge(organizationId: string, voiceId: string) {
  const client = useQueryClient();
  const input = { organizationId, voiceId };
  const options = dashboardOrpc.brand.knowledge.get.queryOptions({ input });
  const query = useQuery({
    ...options,
    enabled: Boolean(organizationId && voiceId),
  });
  const save = useMutation({
    ...dashboardOrpc.brand.knowledge.save.mutationOptions(),
    onSuccess: async (data) => {
      client.setQueryData(options.queryKey, data);
    },
  });
  const scan = useMutation({
    ...dashboardOrpc.brand.knowledge.scan.mutationOptions(),
    onSuccess: async (data) => {
      client.setQueryData(options.queryKey, data);
    },
  });
  return {
    query,
    save: save.mutateAsync,
    scan: scan.mutateAsync,
    isSaving: save.isPending,
    isScanning: scan.isPending,
  };
}
