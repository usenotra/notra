"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@notra/ui/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { useCustomer } from "autumn-js/react";
import { parseAsInteger, useQueryState } from "nuqs";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { FEATURES } from "@/lib/billing/constants";
import type { LogsResponse } from "@/types/webhook-logs";
import { QUERY_KEYS } from "@/utils/query-keys";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import { LogsPageSkeleton } from "./skeleton";

interface PageClientProps {
	organizationSlug: string;
}

export default function PageClient({ organizationSlug }: PageClientProps) {
	const { getOrganization } = useOrganizationsContext();
	const organization = getOrganization(organizationSlug);
	const organizationId = organization?.id;
	const { check, customer } = useCustomer();

	const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

	const has30DayRetention = customer
		? check({ featureId: FEATURES.LOG_RETENTION_30_DAYS }).data?.allowed
		: false;
	const logRetentionDays = has30DayRetention ? 30 : 7;

	const { data, isPending } = useQuery({
		queryKey: QUERY_KEYS.WEBHOOK_LOGS.list(organizationId ?? "", page),
		queryFn: async () => {
			if (!organizationId) {
				throw new Error("Organization ID is required");
			}
			const response = await fetch(
				`/api/organizations/${organizationId}/webhook-logs?integrationType=github&integrationId=all&page=${page}&pageSize=10`,
			);

			if (!response.ok) {
				throw new Error("Failed to fetch webhook logs");
			}

			const result = await response.json();
			return result as LogsResponse;
		},
		enabled: !!organizationId,
	});

	return (
		<PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
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
						Log data is retained for {logRetentionDays} days. Older entries are
						automatically removed.
					</AlertDescription>
				</Alert>

				{organizationId && isPending ? (
					<LogsPageSkeleton />
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
		</PageContainer>
	);
}
