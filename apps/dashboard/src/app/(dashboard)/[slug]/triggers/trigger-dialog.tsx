"use client";

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
import { Label } from "@notra/ui/components/ui/label";
import { ScrollArea } from "@notra/ui/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@notra/ui/components/ui/select";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@notra/ui/components/ui/sheet";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
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

const OUTPUT_OPTIONS: Array<{
	value: OutputContentType;
	label: string;
	disabled?: boolean;
}> = [
	{ value: "changelog", label: "Changelog" },
	{ value: "blog_post", label: "Blog Post", disabled: true },
	{ value: "twitter_post", label: "Twitter Post", disabled: true },
	{ value: "linkedin_post", label: "LinkedIn Post", disabled: true },
	{ value: "investor_update", label: "Investor Update", disabled: true },
];

interface TriggerFormValues {
	sourceType: Trigger["sourceType"];
	eventType: WebhookEventType;
	outputType: OutputContentType;
	repositoryIds: string[];
	schedule: Trigger["sourceConfig"]["cron"];
}

interface TriggerDialogProps {
	organizationId: string;
	onSuccess?: (trigger: Trigger) => void;
	trigger?: React.ReactElement;
	allowedSourceTypes?: Trigger["sourceType"][];
	initialSourceType?: Trigger["sourceType"];
	apiPath?: string;
	editTrigger?: Trigger;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function AddTriggerDialog({
	organizationId,
	onSuccess,
	trigger,
	allowedSourceTypes,
	initialSourceType,
	apiPath,
	editTrigger,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
}: TriggerDialogProps) {
	const isEditMode = !!editTrigger;
	const isScheduleContext =
		initialSourceType === "cron" ||
		(allowedSourceTypes?.length === 1 && allowedSourceTypes[0] === "cron");
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

	const [internalOpen, setInternalOpen] = useState(false);
	const isControlled = controlledOpen !== undefined;
	const open = isControlled ? controlledOpen : internalOpen;
	const setOpen = isControlled
		? (controlledOnOpenChange ?? (() => {}))
		: setInternalOpen;
	const comboboxAnchor = useComboboxAnchor();

	const getDefaultValues = useCallback((): TriggerFormValues => {
		if (editTrigger) {
			return {
				sourceType: editTrigger.sourceType,
				eventType:
					(editTrigger.sourceConfig.eventTypes?.[0] as WebhookEventType) ??
					"release",
				outputType: editTrigger.outputType as OutputContentType,
				repositoryIds: editTrigger.targets.repositoryIds,
				schedule: editTrigger.sourceConfig.cron ?? {
					frequency: "daily",
					hour: 9,
					minute: 0,
				},
			};
		}
		return {
			sourceType: defaultSourceType,
			eventType: "release",
			outputType: "changelog",
			repositoryIds: [],
			schedule: { frequency: "daily", hour: 9, minute: 0 },
		};
	}, [defaultSourceType, editTrigger]);

	const form = useForm({
		defaultValues: getDefaultValues(),
		onSubmit: async ({ value }) => {
			mutation.mutate(value);
		},
	});

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

	const repositories = useMemo(
		() =>
			integrationsResponse?.integrations
				.filter((integration) => integration.type === "github")
				.flatMap((integration) => integration.repositories) ?? [],
		[integrationsResponse],
	);

	const repositoryOptions = useMemo(
		() =>
			repositories.map((repo) => ({
				value: repo.id,
				label: `${repo.owner}/${repo.repo}`,
			})),
		[repositories],
	);

	const mutation = useMutation({
		mutationFn: async (value: TriggerFormValues) => {
			const basePath =
				apiPath ?? `/api/organizations/${organizationId}/triggers`;
			const targetPath = isEditMode
				? `${basePath}?triggerId=${editTrigger.id}`
				: basePath;
			const response = await fetch(targetPath, {
				method: isEditMode ? "PATCH" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sourceType: value.sourceType,
					sourceConfig:
						value.sourceType === "cron"
							? { cron: value.schedule }
							: { eventTypes: [value.eventType] },
					targets: { repositoryIds: value.repositoryIds },
					outputType: value.outputType,
					outputConfig: {},
					enabled: isEditMode ? editTrigger.enabled : true,
				}),
			});

			const payload = await response.json();

			if (!response.ok) {
				if (payload?.code === "DUPLICATE_TRIGGER") {
					throw new Error(
						isScheduleContext ? "Schedule already exists" : "Trigger already exists",
					);
				}
				throw new Error(
					payload?.error ??
						(isEditMode
							? "Failed to update schedule"
							: isScheduleContext
								? "Failed to create schedule"
								: "Failed to create trigger"),
				);
			}

			return payload as { trigger: Trigger };
		},
		onSuccess: (data) => {
			toast.success(
				isEditMode
					? "Schedule updated"
					: isScheduleContext
						? "Schedule added"
						: "Trigger added",
			);
			onSuccess?.(data.trigger);
			setOpen(false);
			form.reset();
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			setOpen(nextOpen);
			if (!nextOpen) {
				form.reset();
			}
		},
		[form],
	);

	return (
		<Sheet onOpenChange={handleOpenChange} open={open}>
			{trigger ? (
				<SheetTrigger render={trigger} />
			) : (
				<SheetTrigger
					render={
						<Button size="sm" variant="outline">
							New trigger
						</Button>
					}
				/>
			)}
			<SheetContent className="sm:max-w-lg" side="right">
				<SheetHeader>
					<SheetTitle className="text-2xl">
						{isEditMode
							? "Edit Schedule"
							: isScheduleContext
								? "Add Schedule"
								: "Add Trigger"}
					</SheetTitle>
					<SheetDescription>
						{isEditMode
							? "Update the schedule configuration."
							: isScheduleContext
								? "Configure when and how to generate content automatically."
								: "Choose a source, targets, and output to automate content."}
					</SheetDescription>
				</SheetHeader>

				<form
					className="flex flex-1 flex-col overflow-hidden"
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<ScrollArea className="flex-1 px-4">
						<div className="space-y-4 py-2">
							<form.Field name="sourceType">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Source</Label>
										{isSourceLocked ? (
											<Input
												disabled
												id={field.name}
												value={
													availableSourceOptions[0]?.label ?? "GitHub webhook"
												}
											/>
										) : (
											<Select
												onValueChange={(value) => {
													if (value) {
														field.handleChange(value as Trigger["sourceType"]);
													}
												}}
												value={field.state.value}
											>
												<SelectTrigger className="w-full" id={field.name}>
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
								)}
							</form.Field>

							<form.Subscribe selector={(state) => state.values.sourceType}>
								{(sourceType) =>
									sourceType === "cron" ? (
										<form.Field name="schedule">
											{(field) => (
												<SchedulePicker
													onChange={field.handleChange}
													value={field.state.value}
												/>
											)}
										</form.Field>
									) : (
										<form.Field name="eventType">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>Event</Label>
													<Select
														onValueChange={(value) => {
															if (value) {
																field.handleChange(value as WebhookEventType);
															}
														}}
														value={field.state.value}
													>
														<SelectTrigger className="w-full" id={field.name}>
															<SelectValue placeholder="Event">
																{EVENT_OPTIONS.find(
																	(o) => o.value === field.state.value,
																)?.label}
															</SelectValue>
														</SelectTrigger>
														<SelectContent>
															{EVENT_OPTIONS.map((option) => (
																<SelectItem
																	key={option.value}
																	value={option.value}
																>
																	{option.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											)}
										</form.Field>
									)
								}
							</form.Subscribe>

							<form.Field name="repositoryIds">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Targets</Label>
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
														field.handleChange(
															Array.isArray(value) ? value : [],
														)
													}
													value={field.state.value}
												>
													<ComboboxChips>
														{field.state.value.map((repoId) => {
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
														<ComboboxEmpty>
															No repositories found.
														</ComboboxEmpty>
														<ComboboxList>
															{repositoryOptions.map((repo) => (
																<ComboboxItem
																	key={repo.value}
																	value={repo.value}
																>
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
								)}
							</form.Field>

							<form.Field name="outputType">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Output</Label>
										<Select
											onValueChange={(value) => {
												if (value) {
													field.handleChange(value as OutputContentType);
												}
											}}
											value={field.state.value}
										>
											<SelectTrigger className="w-full" id={field.name}>
												<SelectValue placeholder="Output">
													{OUTPUT_OPTIONS.find(
														(o) => o.value === field.state.value,
													)?.label}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>
												{OUTPUT_OPTIONS.map((option) => (
													<SelectItem
														key={option.value}
														value={option.value}
														disabled={option.disabled}
													>
														{option.label}
														{option.disabled ? " (Coming soon)" : ""}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}
							</form.Field>

							<div className="space-y-2">
								<Label>Publish destination</Label>
								<Input disabled placeholder="Coming soon (Webflow, Framer)" />
							</div>
						</div>
					</ScrollArea>

					<SheetFooter className="border-t pt-4">
						<SheetClose render={<Button variant="outline">Cancel</Button>} />
						<form.Subscribe
							selector={(state) => ({
								canSubmit:
									state.values.repositoryIds.length > 0 &&
									(state.values.sourceType !== "cron" ||
										(state.values.schedule && state.values.schedule.frequency)),
								isSubmitting: mutation.isPending,
							})}
						>
							{({ canSubmit, isSubmitting }) => (
								<Button disabled={isSubmitting || !canSubmit} type="submit">
									{isSubmitting
										? isEditMode
											? "Saving..."
											: "Adding..."
										: isEditMode
											? "Save changes"
											: isScheduleContext
												? "Add schedule"
												: "Add trigger"}
								</Button>
							)}
						</form.Subscribe>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
