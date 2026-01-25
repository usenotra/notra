"use client";

import {
	ArrowRight01Icon,
	Delete02Icon,
	Link04Icon,
	MoreVerticalIcon,
	PauseIcon,
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

const QUICK_ACTIONS = [
	{
		title: "GitHub webhook",
		description: "React to repo activity and ship instantly.",
		icon: Link04Icon,
	},
	{
		title: "Cross-channel publish",
		description: "Turn events into posts, changelogs, and updates.",
		icon: Rocket02Icon,
	},
	{
		title: "Instant preview",
		description: "Validate payloads before sending to production.",
		icon: ArrowRight01Icon,
	},
];

const EVENT_SOURCE_TYPES: TriggerSourceType[] = ["github_webhook"];

const EVENT_RECIPES = [
	{
		title: "Push to main",
		description: "Auto-generate release notes when new code lands.",
		badge: "Ship faster",
		accentColor: "#1D4ED8",
	},
	{
		title: "Release published",
		description: "Create launch content with every tagged release.",
		badge: "Launch-ready",
		accentColor: "#0E7490",
	},
	{
		title: "Star activity",
		description: "Capture momentum for social and investor updates.",
		badge: "Keep buzz",
		accentColor: "#7C2D12",
	},
];

interface PageClientProps {
	organizationSlug: string;
}

function formatEventList(events?: string[]) {
	if (!events || events.length === 0) {
		return "All events";
	}
	return events.map((event) => event.replace("_", " ")).join(", ");
}

export default function PageClient({ organizationSlug }: PageClientProps) {
	const { getOrganization } = useOrganizationsContext();
	const organization = getOrganization(organizationSlug);
	const organizationId = organization?.id;
	const queryClient = useQueryClient();
	const router = useRouter();

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

	return (
		<div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="w-full space-y-6 px-4 lg:px-6">
				<div className="flex flex-col gap-6">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div className="space-y-2">
							<h1 className="font-bold text-3xl tracking-tight">
								Automation events
							</h1>
              <p className="max-w-2xl text-muted-foreground">
                Turn product activity into ready-to-ship content. Build event
                triggers that listen for GitHub updates and publish across
                channels.
              </p>
						</div>
						<div className="flex flex-wrap items-center gap-3">
							<Button
								onClick={() =>
									router.push(`/${organizationSlug}/automation/schedule`)
								}
								size="sm"
								variant="ghost"
							>
								View schedules
							</Button>
              <AddTriggerDialog
                allowedSourceTypes={EVENT_SOURCE_TYPES}
                initialSourceType="github_webhook"
                apiPath={
                  organizationId
                    ? `/api/organizations/${organizationId}/automation/events`
                    : undefined
                }
                organizationId={organizationId ?? ""}
								onSuccess={() =>
									queryClient.invalidateQueries({
                  queryKey: QUERY_KEYS.AUTOMATION.events(organizationId ?? ""),
									})
								}
								trigger={
									<Button size="sm" variant="default">
										<PlusIcon className="size-4" />
										<span className="ml-1">New event trigger</span>
									</Button>
								}
							/>
						</div>
					</div>

					<div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
						<TitleCard
							action={
								<Button size="sm" variant="outline">
									See templates
								</Button>
							}
							heading="Event recipes"
						>
							<p className="text-muted-foreground text-sm">
								Pre-configured ideas to kickstart automation.
							</p>
							<div className="mt-4 grid gap-3 md:grid-cols-3">
								{EVENT_RECIPES.map((recipe) => (
									<div
										className="rounded-xl border border-border/70 bg-background/70 p-4"
										key={recipe.title}
									>
										<div className="flex items-center justify-between">
											<p className="font-semibold text-sm text-foreground">
												{recipe.title}
											</p>
											<span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
												{recipe.badge}
											</span>
										</div>
										<p className="mt-2 text-muted-foreground text-xs">
											{recipe.description}
										</p>
										<div
											className="mt-3 h-1.5 w-12 rounded-full"
											style={{ backgroundColor: recipe.accentColor }}
										/>
									</div>
								))}
							</div>
						</TitleCard>
						<TitleCard heading="Why events matter">
							<ul className="space-y-3 text-xs text-muted-foreground">
								{QUICK_ACTIONS.map((action) => (
									<li className="flex items-start gap-3" key={action.title}>
										<span className="rounded-lg border border-border/60 bg-background p-2">
											<HugeiconsIcon className="size-4" icon={action.icon} />
										</span>
										<span>
											<span className="block font-medium text-foreground">
												{action.title}
											</span>
											<span className="block text-muted-foreground">
												{action.description}
											</span>
										</span>
									</li>
								))}
							</ul>
						</TitleCard>
					</div>
				</div>

				{isLoading ? (
					<div className="space-y-4">
						<Skeleton className="h-28 w-full" />
						<Skeleton className="h-28 w-full" />
					</div>
				) : eventTriggers.length === 0 ? (
					<div className="rounded-2xl border border-dashed p-10 text-center">
						<h3 className="font-semibold text-lg">No event triggers yet</h3>
						<p className="text-muted-foreground text-sm">
							Build your first automation event to react to GitHub activity.
						</p>
						<div className="mt-4 flex justify-center">
              <AddTriggerDialog
                allowedSourceTypes={EVENT_SOURCE_TYPES}
                initialSourceType="github_webhook"
                apiPath={
                  organizationId
                    ? `/api/organizations/${organizationId}/automation/events`
                    : undefined
                }
                organizationId={organizationId ?? ""}
								onSuccess={() =>
									queryClient.invalidateQueries({
                  queryKey: QUERY_KEYS.AUTOMATION.events(organizationId ?? ""),
									})
								}
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
					<div className="space-y-3">
            {eventTriggers.map((trigger) => (
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
								heading="GitHub webhook"
								key={trigger.id}
							>
								<div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
									<div>
										<p className="font-medium text-foreground">Events</p>
										<p>{formatEventList(trigger.sourceConfig.eventTypes)}</p>
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
