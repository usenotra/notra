"use client";

import {
	Clock01Icon,
	Delete02Icon,
	MoreVerticalIcon,
	PauseIcon,
	PieChartIcon,
	PlayIcon,
	Rocket02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { TitleCard } from "@/components/title-card";
import type { Trigger, TriggerSourceType } from "@/types/triggers";
import { getOutputTypeLabel } from "@/utils/output-types";
import { QUERY_KEYS } from "@/utils/query-keys";
import { AddTriggerDialog } from "../../triggers/trigger-dialog";

const SCHEDULE_METRICS = [
	{
		label: "Active schedules",
		value: "5",
		icon: PieChartIcon,
	},
	{
		label: "Next run",
		value: "Tomorrow, 09:00 UTC",
		icon: Clock01Icon,
	},
	{
		label: "Cadence coverage",
		value: "Daily + weekly",
		icon: Rocket02Icon,
	},
];

const CRON_SOURCE_TYPES: TriggerSourceType[] = ["cron"];

const SCHEDULE_PLAYBOOKS = [
	{
		title: "Weekly changelog",
		description: "Summarize main branch updates every Friday morning.",
		detail: "Best for steady release cadence.",
	},
	{
		title: "Monthly investor update",
		description: "Bundle shipped features into a crisp stakeholder update.",
		detail: "Ideal for planning meetings.",
	},
	{
		title: "Daily social pulse",
		description: "Draft social posts after every set release window.",
		detail: "Great for fast-moving teams.",
	},
];

interface PageClientProps {
	organizationSlug: string;
}

function formatCadence(cadence?: Trigger["sourceConfig"]["cron"]) {
	if (!cadence) {
		return "Cadence not set";
	}
	const time = `${String(cadence.hour).padStart(2, "0")}:${String(
		cadence.minute,
	).padStart(2, "0")} UTC`;
	if (cadence.cadence === "weekly") {
		return `Weekly · ${time}`;
	}
	if (cadence.cadence === "monthly") {
		return `Monthly · ${time}`;
	}
	return `Daily · ${time}`;
}

export default function PageClient({ organizationSlug }: PageClientProps) {
	const { getOrganization } = useOrganizationsContext();
	const organization = getOrganization(organizationSlug);
	const organizationId = organization?.id;
	const queryClient = useQueryClient();
	const router = useRouter();

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

	return (
		<div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="w-full space-y-6 px-4 lg:px-6">
				<div className="flex flex-col gap-6">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div className="space-y-2">
							<h1 className="font-bold text-3xl tracking-tight">
								Automation schedules
							</h1>
              <p className="max-w-2xl text-muted-foreground">
                Plan predictable publishing windows. Configure cron schedules
                that run daily, weekly, or monthly with the outputs you need.
              </p>
						</div>
						<div className="flex flex-wrap items-center gap-3">
							<Button
								onClick={() =>
									router.push(`/${organizationSlug}/automation/events`)
								}
								size="sm"
								variant="ghost"
							>
								View events
							</Button>
              <AddTriggerDialog
                allowedSourceTypes={CRON_SOURCE_TYPES}
                initialSourceType="cron"
                apiPath={
                  organizationId
                    ? `/api/organizations/${organizationId}/automation/schedules`
                    : undefined
                }
                organizationId={organizationId ?? ""}
								onSuccess={() =>
									queryClient.invalidateQueries({
                  queryKey: QUERY_KEYS.AUTOMATION.schedules(organizationId ?? ""),
									})
								}
								trigger={
									<Button size="sm" variant="default">
										<PlusIcon className="size-4" />
										<span className="ml-1">New schedule</span>
									</Button>
								}
							/>
						</div>
					</div>

					<div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
						<TitleCard heading="Scheduling overview">
							<div className="grid gap-4 sm:grid-cols-3">
								{SCHEDULE_METRICS.map((metric) => (
									<div
										className="rounded-xl border border-border/70 bg-background/70 p-4"
										key={metric.label}
									>
										<div className="flex items-center justify-between">
											<p className="text-muted-foreground text-xs">
												{metric.label}
											</p>
											<span className="rounded-full border border-border/70 bg-muted/40 p-2">
												<HugeiconsIcon className="size-4" icon={metric.icon} />
											</span>
										</div>
										<p className="mt-3 text-lg font-semibold">{metric.value}</p>
									</div>
								))}
							</div>
						</TitleCard>
						<TitleCard heading="Popular playbooks">
							<div className="space-y-3">
								{SCHEDULE_PLAYBOOKS.map((playbook) => (
									<div
										className="rounded-xl border border-border/70 bg-background/70 p-4"
										key={playbook.title}
									>
										<p className="font-semibold text-sm text-foreground">
											{playbook.title}
										</p>
										<p className="mt-2 text-muted-foreground text-xs">
											{playbook.description}
										</p>
										<p className="mt-2 text-[11px] text-muted-foreground">
											{playbook.detail}
										</p>
									</div>
								))}
							</div>
						</TitleCard>
					</div>
				</div>

				{isLoading ? (
					<div className="space-y-4">
						<Skeleton className="h-28 w-full" />
						<Skeleton className="h-28 w-full" />
					</div>
				) : scheduleTriggers.length === 0 ? (
					<div className="rounded-2xl border border-dashed p-10 text-center">
						<h3 className="font-semibold text-lg">No schedules yet</h3>
						<p className="text-muted-foreground text-sm">
							Create a schedule to automate recurring content generation.
						</p>
						<div className="mt-4 flex justify-center">
              <AddTriggerDialog
                allowedSourceTypes={CRON_SOURCE_TYPES}
                initialSourceType="cron"
                apiPath={
                  organizationId
                    ? `/api/organizations/${organizationId}/automation/schedules`
                    : undefined
                }
                organizationId={organizationId ?? ""}
								onSuccess={() =>
									queryClient.invalidateQueries({
                  queryKey: QUERY_KEYS.AUTOMATION.schedules(organizationId ?? ""),
									})
								}
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
					<div className="space-y-3">
            {scheduleTriggers.map((trigger) => (
              <TitleCard
                action={
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="flex size-8 items-center justify-center rounded-md hover:bg-accent"
                    >
                      <HugeiconsIcon
                        className="size-4 text-muted-foreground"
                        icon={MoreVerticalIcon}
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => updateMutation.mutate(trigger)}
                      >
                        <HugeiconsIcon
                          className="size-4"
                          icon={trigger.enabled ? PauseIcon : PlayIcon}
                        />
                        {trigger.enabled ? "Pause" : "Enable"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => deleteMutation.mutate(trigger.id)}
                        variant="destructive"
                      >
                        <HugeiconsIcon className="size-4" icon={Delete02Icon} />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
								}
								heading="Scheduled run"
								key={trigger.id}
							>
								<div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
									<div>
										<p className="font-medium text-foreground">Cadence</p>
										<p>{formatCadence(trigger.sourceConfig.cron)}</p>
									</div>
									<div>
										<p className="font-medium text-foreground">Output</p>
										<p>{getOutputTypeLabel(trigger.outputType)}</p>
									</div>
									<div>
										<p className="font-medium text-foreground">Targets</p>
										<p>{trigger.targets.repositoryIds.length} repos</p>
									</div>
									<div>
										<p className="font-medium text-foreground">Status</p>
										<p>{trigger.enabled ? "Active" : "Paused"}</p>
									</div>
								</div>
							</TitleCard>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
