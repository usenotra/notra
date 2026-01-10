"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "convex/react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../../../convex/_generated/api";
import { columns } from "./columns";
import { DataTable } from "./data-table";

interface PageClientProps {
  organizationSlug: string;
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const { getOrganization } = useOrganizationsContext();
  const organization = getOrganization(organizationSlug);
  const organizationId = organization?.id;

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const data = useQuery(
    api.webhook_logs.list,
    organizationId ? { organizationId, page, pageSize: 10 } : "skip"
  );

  const isLoading = data === undefined;

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">Logs</h1>
          <p className="text-muted-foreground">
            View all integration events and their delivery status
          </p>
        </div>

        <Alert>
          <HugeiconsIcon className="size-4" icon={InformationCircleIcon} />
          <AlertDescription>
            Log data is retained for 30 days. Older entries are automatically
            removed.
          </AlertDescription>
        </Alert>

        {organizationId && isLoading ? (
          <DataSkeleton />
        ) : (
          <DataTable
            columns={columns}
            data={data?.logs ?? []}
            onPageChange={setPage}
            page={page}
            totalPages={data?.pagination.totalPages ?? 1}
          />
        )}
      </div>
    </div>
  );
}

export function DataSkeleton() {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border">
        <div className="p-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              className="flex items-center space-x-4 py-3"
              key={`skeleton-${
                // biome-ignore lint/suspicious/noArrayIndexKey: This is static for loading
                i
              }`}
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
