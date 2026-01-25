"use client";

import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@notra/ui/components/ui/table";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import type { Trigger, TriggerSourceType } from "@/types/triggers";
import { getOutputTypeLabel } from "@/utils/output-types";
import { QUERY_KEYS } from "@/utils/query-keys";
import { TriggerRowActions } from "../_components/trigger-row-actions";
import { TriggerStatusBadge } from "../_components/trigger-status-badge";
import { AddTriggerDialog } from "../../triggers/trigger-dialog";

const CRON_SOURCE_TYPES: TriggerSourceType[] = ["cron"];

function formatCadence(cron?: Trigger["sourceConfig"]["cron"]) {
	if (!cron) return "Not set";
	const time = `${String(cron.hour).padStart(2, "0")}:${String(cron.minute).padStart(2, "0")} UTC`;
	if (cron.cadence === "weekly") {
		const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		return `Weekly - ${days[cron.dayOfWeek ?? 0]} @ ${time}`;
	}
	if (cron.cadence === "monthly") {
		return `Monthly - Day ${cron.dayOfMonth} @ ${time}`;
	}
	return `Daily @ ${time}`;
}

function formatDate(dateString: string) {
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(dateString));
}

interface PageClientProps {
	organizationSlug: string;
}

export default function PageClient({ organizationSlug }: PageClientProps) {
	const { getOrganization } = useOrganizationsContext();
	const organization = getOrganization(organizationSlug);
	const organizationId = organization?.id;
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState<"active" | "paused">("active");

	const { data, isLoading } = useQuery({
		queryKey: QUERY_KEYS.AUTOMATION.schedules(organizationId ?? ""),
		queryFn: async () => {
			if (!organizationId) {
				throw new Error("Organization ID is required");
			}
			const response = await fetch(
				`/api/organizations/${organizationId}/automation/schedules`,
			);

			if (!response.ok) {
				throw new Error("Failed to fetch triggers");
			}

			return response.json() as Promise<{ triggers: Trigger[] }>;
		},
		enabled: !!organizationId,
	});

	const updateMutation = useMutation({
		mutationFn: async (trigger: Trigger) => {
			if (!organizationId) {
				throw new Error("Organization ID is required");
			}
			const response = await fetch(
				`/api/organizations/${organizationId}/automation/schedules?triggerId=${trigger.id}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						sourceType: trigger.sourceType,
						sourceConfig: trigger.sourceConfig,
						targets: trigger.targets,
						outputType: trigger.outputType,
						outputConfig: trigger.outputConfig,
						enabled: !trigger.enabled,
					}),
				},
			);

			if (!response.ok) {
				throw new Error("Failed to update schedule");
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.AUTOMATION.schedules(organizationId ?? ""),
			});
		},
		onError: () => {
			toast.error("Failed to update schedule");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (triggerId: string) => {
			if (!organizationId) {
				throw new Error("Organization ID is required");
			}
			const response = await fetch(
				`/api/organizations/${organizationId}/automation/schedules?triggerId=${triggerId}`,
				{ method: "DELETE" },
			);

			if (!response.ok) {
				throw new Error("Failed to delete schedule");
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.AUTOMATION.schedules(organizationId ?? ""),
			});
			toast.success("Schedule removed");
		},
		onError: () => {
			toast.error("Failed to delete schedule");
		},
	});

	const triggers = data?.triggers ?? [];
	const scheduleTriggers = useMemo(
		() => triggers.filter((trigger) => trigger.sourceType === "cron"),
		[triggers],
	);

	const filteredTriggers = useMemo(() => {
		return scheduleTriggers.filter((t) =>
			activeTab === "active" ? t.enabled : !t.enabled,
		);
	}, [scheduleTriggers, activeTab]);

	const activeCounts = useMemo(() => {
		let active = 0;
		let paused = 0;
		for (const t of scheduleTriggers) {
			if (t.enabled) {
				active++;
			} else {
				paused++;
			}
		}
		return { active, paused };
	}, [scheduleTriggers]);

	const handleToggle = useCallback(
		(trigger: Trigger) => updateMutation.mutate(trigger),
		[updateMutation],
	);

	const handleDelete = useCallback(
		(id: string) => deleteMutation.mutate(id),
		[deleteMutation],
	);

	return (
		<div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="w-full space-y-6 px-4 lg:px-6">
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<h1 className="font-bold text-3xl tracking-tight">
							Automation Schedules
						</h1>
						<p className="text-muted-foreground">
							Configure cron schedules that run daily, weekly, or monthly.
						</p>
					</div>
					<AddTriggerDialog
						allowedSourceTypes={CRON_SOURCE_TYPES}
						apiPath={
							organizationId
								? `/api/organizations/${organizationId}/automation/schedules`
								: undefined
						}
						initialSourceType="cron"
						onSuccess={() =>
							queryClient.invalidateQueries({
								queryKey: QUERY_KEYS.AUTOMATION.schedules(organizationId ?? ""),
							})
						}
						organizationId={organizationId ?? ""}
						trigger={
							<Button size="sm" variant="default">
								<PlusIcon className="size-4" />
								<span className="ml-1">New schedule</span>
							</Button>
						}
					/>
				</div>

				{isLoading ? (
					<div className="space-y-4">
						<Skeleton className="h-10 w-48" />
						<Skeleton className="h-64 w-full" />
					</div>
				) : scheduleTriggers.length === 0 ? (
					<div className="rounded-2xl border border-dashed p-12 text-center">
						<h3 className="font-semibold text-lg">No schedules yet</h3>
						<p className="mt-1 text-muted-foreground text-sm">
							Create your first schedule to automate recurring content.
						</p>
						<div className="mt-4">
							<AddTriggerDialog
								allowedSourceTypes={CRON_SOURCE_TYPES}
								apiPath={
									organizationId
										? `/api/organizations/${organizationId}/automation/schedules`
										: undefined
								}
								initialSourceType="cron"
								onSuccess={() =>
									queryClient.invalidateQueries({
										queryKey: QUERY_KEYS.AUTOMATION.schedules(
											organizationId ?? "",
										),
									})
								}
								organizationId={organizationId ?? ""}
								trigger={
									<Button size="sm" variant="outline">
										<PlusIcon className="size-4" />
										<span className="ml-1">Add schedule</span>
									</Button>
								}
							/>
						</div>
					</div>
				) : (
					<Tabs
						defaultValue="active"
						onValueChange={(value) =>
							setActiveTab(value as "active" | "paused")
						}
					>
						<TabsList>
							<TabsTrigger value="active">
								Active ({activeCounts.active})
							</TabsTrigger>
							<TabsTrigger value="paused">
								Paused ({activeCounts.paused})
							</TabsTrigger>
						</TabsList>

						<TabsContent className="mt-4" value="active">
							<ScheduleTable
								onDelete={handleDelete}
								onToggle={handleToggle}
								triggers={filteredTriggers}
							/>
						</TabsContent>

						<TabsContent className="mt-4" value="paused">
							<ScheduleTable
								onDelete={handleDelete}
								onToggle={handleToggle}
								triggers={filteredTriggers}
							/>
						</TabsContent>
					</Tabs>
				)}
			</div>
		</div>
	);
}

function ScheduleTable({
	triggers,
	onToggle,
	onDelete,
}: {
	triggers: Trigger[];
	onToggle: (trigger: Trigger) => void;
	onDelete: (triggerId: string) => void;
}) {
	if (triggers.length === 0) {
		return (
			<div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
				No schedules in this category.
			</div>
		);
	}

	return (
		<div className="rounded-xl border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Type</TableHead>
						<TableHead>Cadence</TableHead>
						<TableHead>Output</TableHead>
						<TableHead>Targets</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Created</TableHead>
						<TableHead className="w-12" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{triggers.map((trigger) => (
						<TableRow key={trigger.id}>
							<TableCell>
								<div className="flex items-center gap-2">
									<span className="flex size-8 items-center justify-center rounded-lg border bg-muted/50">
										<HugeiconsIcon
											className="size-4 text-muted-foreground"
											icon={Calendar03Icon}
										/>
									</span>
									<span className="text-sm">Scheduled run</span>
								</div>
							</TableCell>
							<TableCell className="text-muted-foreground">
								{formatCadence(trigger.sourceConfig.cron)}
							</TableCell>
							<TableCell className="text-muted-foreground">
								{getOutputTypeLabel(trigger.outputType)}
							</TableCell>
							<TableCell className="text-muted-foreground">
								{trigger.targets.repositoryIds.length} repositories
							</TableCell>
							<TableCell>
								<TriggerStatusBadge enabled={trigger.enabled} />
							</TableCell>
							<TableCell className="text-muted-foreground">
								{formatDate(trigger.createdAt)}
							</TableCell>
							<TableCell>
								<TriggerRowActions
									onDelete={onDelete}
									onToggle={onToggle}
									trigger={trigger}
								/>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
