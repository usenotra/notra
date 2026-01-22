"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@notra/ui/components/ui/alert-dialog";
import { Button } from "@notra/ui/components/ui/button";
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
	useComboboxAnchor,
} from "@notra/ui/components/ui/combobox";
import { Input } from "@notra/ui/components/ui/input";
import { ScrollArea } from "@notra/ui/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@notra/ui/components/ui/select";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { GitHubIntegration } from "@/types/integrations";
import type { Trigger } from "@/types/triggers";
import { QUERY_KEYS } from "@/utils/query-keys";
import type {
	OutputContentType,
	WebhookEventType,
} from "@/utils/schemas/integrations";
import { SchedulePicker } from "./trigger-schedule-picker";

const EVENT_OPTIONS: Array<{ value: WebhookEventType; label: string }> = [
	{ value: "release", label: "Release published" },
	{ value: "push", label: "Push to default branch" },
	{ value: "star", label: "New star" },
];

const OUTPUT_OPTIONS: Array<{ value: OutputContentType; label: string }> = [
	{ value: "changelog", label: "Changelog" },
	{ value: "blog_post", label: "Blog Post" },
	{ value: "twitter_post", label: "Twitter Post" },
	{ value: "linkedin_post", label: "LinkedIn Post" },
	{ value: "investor_update", label: "Investor Update" },
];

interface AddTriggerDialogProps {
	organizationId: string;
	onSuccess?: (trigger: Trigger) => void;
	trigger?: React.ReactElement;
	allowedSourceTypes?: Trigger["sourceType"][];
	initialSourceType?: Trigger["sourceType"];
	apiPath?: string;
}

export function AddTriggerDialog({
	organizationId,
	onSuccess,
	trigger,
	allowedSourceTypes,
	initialSourceType,
	apiPath,
}: AddTriggerDialogProps) {
	const sourceOptions: Array<{
		value: Trigger["sourceType"];
		label: string;
	}> = [
		{ value: "github_webhook", label: "GitHub webhook" },
		{ value: "cron", label: "Schedule" },
	];
	const availableSourceTypes =
		allowedSourceTypes ?? sourceOptions.map((option) => option.value);
	const availableSourceOptions = sourceOptions.filter((option) =>
		availableSourceTypes.includes(option.value),
	);
	const isSourceLocked = availableSourceOptions.length === 1;
	const defaultSourceType =
		initialSourceType && availableSourceTypes.includes(initialSourceType)
			? initialSourceType
			: (availableSourceOptions[0]?.value ?? "github_webhook");
	const [open, setOpen] = useState(false);
	const [sourceType, setSourceType] =
		useState<Trigger["sourceType"]>(defaultSourceType);
	const [eventType, setEventType] = useState<WebhookEventType>("release");
	const [outputType, setOutputType] = useState<OutputContentType>("changelog");
	const [repositoryIds, setRepositoryIds] = useState<string[]>([]);
	const [schedule, setSchedule] =
		useState<Trigger["sourceConfig"]["cron"]>(undefined);
	const comboboxAnchor = useComboboxAnchor();

	const { data: integrationsResponse, isLoading: isLoadingRepos } = useQuery({
		queryKey: QUERY_KEYS.INTEGRATIONS.all(organizationId),
		queryFn: async () => {
			const response = await fetch(
				`/api/organizations/${organizationId}/integrations`,
			);

			if (!response.ok) {
				throw new Error("Failed to fetch integrations");
			}

			return response.json() as Promise<{
				integrations: Array<GitHubIntegration & { type: string }>;
			}>;
		},
		enabled: !!organizationId,
	});

	const repositories =
		integrationsResponse?.integrations
			.filter((integration) => integration.type === "github")
			.flatMap((integration) => integration.repositories) ?? [];
	const repositoryOptions = repositories.map((repo) => ({
		value: repo.id,
		label: `${repo.owner}/${repo.repo}`,
	}));

	const mutation = useMutation({
		mutationFn: async () => {
			const targetPath =
				apiPath ?? `/api/organizations/${organizationId}/triggers`;
			const response = await fetch(targetPath, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sourceType,
					sourceConfig:
						sourceType === "cron"
							? { cron: schedule }
							: { eventTypes: [eventType] },
					targets: { repositoryIds },
					outputType,
					outputConfig: {},
					enabled: true,
				}),
			});

			const payload = await response.json();

			if (!response.ok) {
				if (payload?.code === "DUPLICATE_TRIGGER") {
					throw new Error("Trigger already exists");
				}
				throw new Error(payload?.error ?? "Failed to create trigger");
			}

			return payload as { trigger: Trigger };
		},
		onSuccess: (data) => {
			toast.success("Trigger added");
			onSuccess?.(data.trigger);
			setOpen(false);
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const canSubmit =
		repositoryIds.length > 0 &&
		(sourceType !== "cron" || (schedule && schedule.cadence));

	return (
		<AlertDialog onOpenChange={setOpen} open={open}>
			{trigger ? (
				<AlertDialogTrigger render={trigger} />
			) : (
				<AlertDialogTrigger
					render={
						<Button size="sm" variant="outline">
							New trigger
						</Button>
					}
				/>
			)}
			<AlertDialogContent className="sm:max-w-[640px] overflow-hidden">
				<AlertDialogHeader>
					<AlertDialogTitle className="text-2xl">Add Trigger</AlertDialogTitle>
					<AlertDialogDescription>
						Choose a source, targets, and output to automate content.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<ScrollArea className="max-h-[60vh]">
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<p className="font-medium text-sm">Source</p>
							{isSourceLocked ? (
								<Input
									disabled
									value={availableSourceOptions[0]?.label ?? "GitHub webhook"}
								/>
							) : (
								<Select
									onValueChange={(value) => {
										if (value) {
											setSourceType(value as Trigger["sourceType"]);
										}
									}}
									value={sourceType}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Source" />
									</SelectTrigger>
									<SelectContent>
										{availableSourceOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</div>

						{sourceType === "cron" ? (
							<SchedulePicker value={schedule} onChange={setSchedule} />
						) : (
							<div className="space-y-2">
								<p className="font-medium text-sm">Event</p>
								<Select
									onValueChange={(value) => {
										if (value) {
											setEventType(value as WebhookEventType);
										}
									}}
									value={eventType}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Event" />
									</SelectTrigger>
									<SelectContent>
										{EVENT_OPTIONS.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						<div className="space-y-2">
							<p className="font-medium text-sm">Targets</p>
							{isLoadingRepos ? (
								<Skeleton className="h-10 w-full" />
							) : repositories.length === 0 ? (
								<div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
									Add a GitHub repository first to select targets.
								</div>
							) : (
								<div ref={comboboxAnchor}>
									<Combobox
										items={repositoryOptions.map((repo) => repo.value)}
										multiple
										onValueChange={(value) =>
											setRepositoryIds(Array.isArray(value) ? value : [])
										}
										value={repositoryIds}
									>
										<ComboboxChips>
											{repositoryIds.map((repoId) => {
												const repo = repositoryOptions.find(
													(option) => option.value === repoId,
												);
												if (!repo) {
													return null;
												}
												return (
													<ComboboxChip key={repo.value}>
														{repo.label}
													</ComboboxChip>
												);
											})}
											<ComboboxChipsInput placeholder="Search repositories" />
										</ComboboxChips>
										<ComboboxContent anchor={comboboxAnchor.current}>
											<ComboboxEmpty>No repositories found.</ComboboxEmpty>
											<ComboboxList>
												{repositoryOptions.map((repo) => (
													<ComboboxItem key={repo.value} value={repo.value}>
														{repo.label}
													</ComboboxItem>
												))}
											</ComboboxList>
										</ComboboxContent>
									</Combobox>
								</div>
							)}

							<p className="text-muted-foreground text-xs">
								Pick one or more repositories.
							</p>
						</div>

						<div className="space-y-2">
							<p className="font-medium text-sm">Output</p>
							<Select
								onValueChange={(value) => {
									if (value) {
										setOutputType(value as OutputContentType);
									}
								}}
								value={outputType}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Output" />
								</SelectTrigger>
								<SelectContent>
									{OUTPUT_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<p className="font-medium text-sm">Publish destination</p>
							<Input disabled placeholder="Coming soon (Webflow, Framer)" />
						</div>
					</div>
				</ScrollArea>

				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						disabled={mutation.isPending || !canSubmit}
						onClick={(event) => {
							event.preventDefault();
							mutation.mutate();
						}}
					>
						{mutation.isPending ? "Adding..." : "Add trigger"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
