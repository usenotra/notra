"use client";

import { Logout02Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Badge } from "@notra/ui/components/ui/badge";
import { Button } from "@notra/ui/components/ui/button";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	type Organization,
	useOrganizationsContext,
} from "@/components/providers/organization-provider";
import { TitleCard } from "@/components/title-card";
import { authClient } from "@/lib/auth/client";
import { setLastVisitedOrganization } from "@/utils/cookies";
import { QUERY_KEYS } from "@/utils/query-keys";

export function OrganizationsSection() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { organizations, activeOrganization, isLoading } =
		useOrganizationsContext();

	const [isSwitching, setIsSwitching] = useState<string | null>(null);
	const [isLeaving, setIsLeaving] = useState<string | null>(null);

	async function switchOrganization(org: Organization) {
		if (org.slug === activeOrganization?.slug) {
			return;
		}

		setIsSwitching(org.id);

		try {
			const { error } = await authClient.organization.setActive({
				organizationId: org.id,
			});

			if (error) {
				toast.error(error.message || "Failed to switch organization");
				return;
			}

			await setLastVisitedOrganization(org.slug);

			await queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.AUTH.activeOrganization,
			});

			router.push(`/${org.slug}`);
		} catch (error) {
			toast.error("Failed to switch organization");
			console.error(error);
		} finally {
			setIsSwitching(null);
		}
	}

	async function leaveOrganization(org: Organization) {
		setIsLeaving(org.id);

		try {
			const { error } = await authClient.organization.leave({
				organizationId: org.id,
			});

			if (error) {
				toast.error(error.message || "Failed to leave organization");
				return;
			}

			toast.success(`Left ${org.name}`);

			// Refresh organizations list and wait for fresh data
			await queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.AUTH.organizations,
			});
			const freshOrgs = await queryClient.fetchQuery({
				queryKey: QUERY_KEYS.AUTH.organizations,
				queryFn: async () => {
					const result = await authClient.organization.list();
					return result.data ?? [];
				},
			});

			if (activeOrganization?.id === org.id) {
				const firstOrg = freshOrgs[0];
				if (firstOrg) {
					await authClient.organization.setActive({
						organizationId: firstOrg.id,
					});
					await setLastVisitedOrganization(firstOrg.slug);
					await queryClient.invalidateQueries({
						queryKey: QUERY_KEYS.AUTH.activeOrganization,
					});
					router.push(`/${firstOrg.slug}`);
				}
			}
		} catch (error) {
			toast.error("Failed to leave organization");
			console.error(error);
		} finally {
			setIsLeaving(null);
		}
	}

	if (isLoading) {
		return (
			<TitleCard className="lg:col-span-2" heading="Organizations">
				<div className="space-y-3">
					{[1, 2, 3].map((i) => (
						<div
							className="flex items-center justify-between rounded-lg border p-4"
							key={i}
						>
							<div className="flex items-center gap-3">
								<Skeleton className="size-10 rounded-lg" />
								<div className="space-y-2">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-3 w-16" />
								</div>
							</div>
							<Skeleton className="h-8 w-20" />
						</div>
					))}
				</div>
			</TitleCard>
		);
	}

	return (
		<TitleCard className="lg:col-span-2" heading="Organizations">
			<div className="space-y-4">
				<p className="text-muted-foreground text-sm">
					Organizations you are a member of
				</p>

				<div className="space-y-3">
					{organizations.map((org) => {
						// Determine if user can leave this org
						// Users cannot leave if they are the owner
						// This is a simplified check - in production you'd check the actual role
						const isActive = activeOrganization?.id === org.id;
						// We'll show a badge indicating their role
						// Note: We don't have the role directly from list, we'd need to enhance the API
						// For now, we'll disable leave for single-member orgs

						return (
							<div
								className="flex items-center justify-between rounded-lg border p-4"
								key={org.id}
							>
								<div className="flex items-center gap-3">
									<Avatar className="size-10 rounded-lg after:rounded-lg">
										<AvatarImage
											alt={org.name}
											className="rounded-lg"
											src={org.logo ?? undefined}
										/>
										<AvatarFallback className="rounded-lg">
											{org.name.charAt(0).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div>
										<div className="flex items-center gap-2">
											<p className="font-medium text-sm">{org.name}</p>
											{isActive && (
												<Badge
													className="bg-emerald-500/15 px-1.5 py-0 text-[10px] font-semibold text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400"
													variant="secondary"
												>
													Active
												</Badge>
											)}
										</div>
										<p className="text-muted-foreground text-xs">{org.slug}</p>
									</div>
								</div>

								<div className="flex items-center gap-2">
									{!isActive && (
										<Button
											disabled={isSwitching === org.id}
											onClick={() => switchOrganization(org)}
											size="sm"
											variant="outline"
										>
											{isSwitching === org.id ? (
												<LoaderCircle className="size-4 animate-spin" />
											) : (
												<>
													<HugeiconsIcon icon={ViewIcon} size={16} />
													View
												</>
											)}
										</Button>
									)}

									{/* Only show leave button for non-active orgs to simplify UX */}
									{!isActive && organizations.length > 1 && (
										<AlertDialog>
											<AlertDialogTrigger
												render={
													<Button
														disabled={isLeaving === org.id}
														size="sm"
														variant="ghost"
													>
														{isLeaving === org.id ? (
															<LoaderCircle className="size-4 animate-spin" />
														) : (
															<>
																<HugeiconsIcon icon={Logout02Icon} size={16} />
																Leave
															</>
														)}
													</Button>
												}
											/>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>Leave {org.name}?</AlertDialogTitle>
													<AlertDialogDescription>
														You will lose access to this organization and all
														its content. You'll need to be invited again to
														rejoin.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Cancel</AlertDialogCancel>
													<AlertDialogAction
														className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
														onClick={() => leaveOrganization(org)}
													>
														Leave Organization
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									)}
								</div>
							</div>
						);
					})}
				</div>

				{organizations.length === 0 && (
					<div className="rounded-lg border border-dashed p-6 text-center">
						<p className="text-muted-foreground text-sm">
							You are not a member of any organizations
						</p>
					</div>
				)}
			</div>
		</TitleCard>
	);
}
