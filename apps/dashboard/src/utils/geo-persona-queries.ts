import type { QueryClient } from "@tanstack/react-query";

import { dashboardOrpc } from "@/lib/orpc/query";

export function geoPersonaUpdateMutationKey(
  organizationId: string,
  projectId: string | undefined
) {
  return ["geo", "personaUpdate", organizationId, projectId ?? null] as const;
}

export function invalidatePersonaList(
  queryClient: QueryClient,
  organizationId: string,
  projectId: string | undefined
) {
  return queryClient.invalidateQueries({
    queryKey: dashboardOrpc.geo.personasList.queryKey({
      input: { organizationId, projectId },
    }),
  });
}

/** What to do when a generation job we started in this tab reaches a terminal status. */
export function personaGenerationListAction(
  job: { id: string; status: string } | null | undefined,
  startedJobId: string | null
): "wait" | "refresh" | "fail" | "ignore" {
  if (!job || !startedJobId || job.id !== startedJobId) {
    return "ignore";
  }
  if (job.status === "queued" || job.status === "running") {
    return "wait";
  }
  return job.status === "completed" ? "refresh" : "fail";
}
