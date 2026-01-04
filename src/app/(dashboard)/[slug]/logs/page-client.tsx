"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAsInteger, useQueryState } from "nuqs";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { Skeleton } from "@/components/ui/skeleton";
import type { WebhookLogsResponse } from "@/types/webhook-logs";
import { QUERY_KEYS } from "@/utils/query-keys";
import { columns } from "./columns";
import { DataTable } from "./data-table";

interface PageClientProps {
  organizationSlug: string;
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const { getOrganization } = useOrganizationsContext();
  const organization = getOrganization(organizationSlug);
  const organizationId = organization?.id;

  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1)
  );

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.WEBHOOK_LOGS.list(organizationId ?? "", page),
    queryFn: async () => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }
      const response = await fetch(
        `/api/organizations/${organizationId}/webhook-logs?page=${page}&pageSize=10`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch webhook logs");
      }

      const result = await response.json();
      return result as WebhookLogsResponse;
    },
    enabled: !!organizationId,
  });

  if (!organizationId) {
    return (
      <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <div className="space-y-1">
            <h1 className="font-bold text-3xl tracking-tight">Webhook Logs</h1>
            <p className="text-muted-foreground">
              Please select an organization to view logs
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">Webhook Logs</h1>
          <p className="text-muted-foreground">
            View all webhook events and their delivery status
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-md border">
              <div className="p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 py-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data?.logs ?? []}
            page={page}
            totalPages={data?.pagination.totalPages ?? 1}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
