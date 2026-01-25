"use client";

import { GithubIcon } from "@hugeicons/core-free-icons";
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
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import type { Trigger, TriggerSourceType } from "@/types/triggers";
import { getOutputTypeLabel } from "@/utils/output-types";
import { QUERY_KEYS } from "@/utils/query-keys";
import { TriggerRowActions } from "../_components/trigger-row-actions";
import { TriggerStatusBadge } from "../_components/trigger-status-badge";
import { AddTriggerDialog } from "../../triggers/trigger-dialog";

const EVENT_SOURCE_TYPES: TriggerSourceType[] = ["github_webhook"];

function formatEventList(events?: string[]) {
	if (!events || events.length === 0) {
		return "All events";
	}
	return events.map((event) => event.replace("_", " ")).join(", ");
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
		queryKey: QUERY_KEYS.AUTOMATION.events(organizationId ?? ""),
		queryFn: async () => {
			if (!organizationId) {
				throw new Error("Organization ID is required");
			}
			const response = await fetch(
				`/api/organizations/${organizationId}/automation/events`,
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
				`/api/organizations/${organizationId}/automation/events?triggerId=${trigger.id}`,
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
				throw new Error("Failed to update trigger");
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.AUTOMATION.events(organizationId ?? ""),
			});
		},
		onError: () => {
			toast.error("Failed to update trigger");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (triggerId: string) => {
			if (!organizationId) {
				throw new Error("Organization ID is required");
			}
			const response = await fetch(
				`/api/organizations/${organizationId}/automation/events?triggerId=${triggerId}`,
				{ method: "DELETE" },
			);

			if (!response.ok) {
				throw new Error("Failed to delete trigger");
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.AUTOMATION.events(organizationId ?? ""),
			});
			toast.success("Event trigger removed");
		},
		onError: () => {
			toast.error("Failed to delete trigger");
		},
	});

	const triggers = data?.triggers ?? [];
	const eventTriggers = useMemo(
		() => triggers.filter((trigger) => trigger.sourceType === "github_webhook"),
		[triggers],
	);

	const filteredTriggers = useMemo(() => {
		return eventTriggers.filter((t) =>
			activeTab === "active" ? t.enabled : !t.enabled,
		);
	}, [eventTriggers, activeTab]);

	const activeCounts = useMemo(
		() => ({
			active: eventTriggers.filter((t) => t.enabled).length,
			paused: eventTriggers.filter((t) => !t.enabled).length,
		}),
		[eventTriggers],
	);

	return (
		<div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="w-full space-y-6 px-4 lg:px-6">
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<h1 className="font-bold text-3xl tracking-tight">
							Automation Events
						</h1>
						<p className="text-muted-foreground">
							React to GitHub activity and trigger content generation
							automatically.
						</p>
					</div>
					<AddTriggerDialog
						allowedSourceTypes={EVENT_SOURCE_TYPES}
						apiPath={
							organizationId
								? `/api/organizations/${organizationId}/automation/events`
								: undefined
						}
						initialSourceType="github_webhook"
						onSuccess={() =>
							queryClient.invalidateQueries({
								queryKey: QUERY_KEYS.AUTOMATION.events(organizationId ?? ""),
							})
						}
						organizationId={organizationId ?? ""}
						trigger={
							<Button size="sm" variant="default">
								<PlusIcon className="size-4" />
								<span className="ml-1">New event trigger</span>
							</Button>
						}
					/>
				</div>

				{isLoading ? (
					<div className="space-y-4">
						<Skeleton className="h-10 w-48" />
						<Skeleton className="h-64 w-full" />
					</div>
				) : eventTriggers.length === 0 ? (
					<div className="rounded-2xl border border-dashed p-12 text-center">
						<h3 className="font-semibold text-lg">No event triggers yet</h3>
						<p className="mt-1 text-muted-foreground text-sm">
							Create your first event trigger to react to GitHub activity.
						</p>
						<div className="mt-4">
							<AddTriggerDialog
								allowedSourceTypes={EVENT_SOURCE_TYPES}
								apiPath={
									organizationId
										? `/api/organizations/${organizationId}/automation/events`
										: undefined
								}
								initialSourceType="github_webhook"
								onSuccess={() =>
									queryClient.invalidateQueries({
										queryKey: QUERY_KEYS.AUTOMATION.events(organizationId ?? ""),
									})
								}
								organizationId={organizationId ?? ""}
								trigger={
									<Button size="sm" variant="outline">
										<PlusIcon className="size-4" />
										<span className="ml-1">Add event trigger</span>
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
							<EventTable
								onDelete={(id) => deleteMutation.mutate(id)}
								onToggle={(trigger) => updateMutation.mutate(trigger)}
								triggers={filteredTriggers}
							/>
						</TabsContent>

						<TabsContent className="mt-4" value="paused">
							<EventTable
								onDelete={(id) => deleteMutation.mutate(id)}
								onToggle={(trigger) => updateMutation.mutate(trigger)}
								triggers={filteredTriggers}
							/>
						</TabsContent>
					</Tabs>
				)}
			</div>
		</div>
	);
}

function EventTable({
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
				No event triggers in this category.
			</div>
		);
	}

	return (
		<div className="rounded-xl border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Type</TableHead>
						<TableHead>Events</TableHead>
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
											icon={GithubIcon}
										/>
									</span>
									<span className="text-sm">GitHub webhook</span>
								</div>
							</TableCell>
							<TableCell className="text-muted-foreground">
								{formatEventList(trigger.sourceConfig.eventTypes)}
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
